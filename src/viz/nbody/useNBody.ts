import { useCallback, useEffect, useRef } from 'react';
import { createHost, type NBodyMessage, type NBodyRequest } from '../../core/nbody/protocol';

interface Engine {
  post(request: NBodyRequest): void;
  close(): void;
}

/**
 * Talks to the n-body engine in a Web Worker (see core/nbody/protocol.ts).
 * Messages from the engine go to `onMessage`. Requests sent before the worker
 * exists (it starts after the figure mounts) wait for it. Where workers aren't
 * available, the same engine runs on the main thread.
 */
export function useNBody(onMessage: (message: NBodyMessage) => void): (request: NBodyRequest) => void {
  const callback = useRef(onMessage);
  useEffect(() => {
    callback.current = onMessage;
  });
  const engine = useRef<Engine | null>(null);
  const queue = useRef<NBodyRequest[]>([]);

  useEffect(() => {
    const deliver = (message: NBodyMessage) => callback.current(message);
    const e = typeof Worker === 'undefined' ? mainThreadEngine(deliver) : workerEngine(deliver);
    engine.current = e;
    for (const request of queue.current) e.post(request);
    queue.current = [];
    return () => {
      e.close();
      engine.current = null;
    };
  }, []);

  return useCallback((request: NBodyRequest) => {
    if (engine.current) engine.current.post(request);
    else queue.current.push(request);
  }, []);
}

function workerEngine(deliver: (message: NBodyMessage) => void): Engine {
  const worker = new Worker(new URL('../../workers/nbody.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<NBodyMessage>) => deliver(event.data);
  worker.onerror = () => deliver({ type: 'error', message: 'The simulation couldn’t start.' });
  return { post: (request) => worker.postMessage(request), close: () => worker.terminate() };
}

function mainThreadEngine(deliver: (message: NBodyMessage) => void): Engine {
  const host = createHost(deliver);
  let frame: number | null = null;
  let last = 0;
  let closed = false;
  const loop = (now: number) => {
    host.tick(Math.min(0.1, (now - last) / 1000));
    last = now;
    frame = host.running && !closed ? requestAnimationFrame(loop) : null;
  };
  return {
    post(request) {
      host.receive(request);
      if (host.running && frame === null) {
        last = performance.now();
        frame = requestAnimationFrame(loop);
      }
    },
    close() {
      closed = true;
      if (frame !== null) cancelAnimationFrame(frame);
    },
  };
}
