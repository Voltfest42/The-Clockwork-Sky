import { useCallback, useEffect, useRef } from 'react';
import { createOrreryHost, type OrreryMessage, type OrreryRequest } from '../../core/orrery/protocol';

interface Engine {
  post(request: OrreryRequest): void;
  close(): void;
}

/**
 * Talks to the Orrery's engine in a Web Worker (see core/orrery/protocol.ts),
 * like useNBody does for the chapter figures. Requests sent before the worker
 * exists wait for it; where workers aren't available, the engine runs on the
 * main thread.
 */
export function useOrrery(onMessage: (message: OrreryMessage) => void): (request: OrreryRequest) => void {
  const callback = useRef(onMessage);
  useEffect(() => {
    callback.current = onMessage;
  });
  const engine = useRef<Engine | null>(null);
  const queue = useRef<OrreryRequest[]>([]);

  useEffect(() => {
    const deliver = (message: OrreryMessage) => callback.current(message);
    const e = typeof Worker === 'undefined' ? mainThreadEngine(deliver) : workerEngine(deliver);
    engine.current = e;
    for (const request of queue.current) e.post(request);
    queue.current = [];
    return () => {
      e.close();
      engine.current = null;
    };
  }, []);

  return useCallback((request: OrreryRequest) => {
    if (engine.current) engine.current.post(request);
    else queue.current.push(request);
  }, []);
}

function workerEngine(deliver: (message: OrreryMessage) => void): Engine {
  const worker = new Worker(new URL('../../workers/orrery.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<OrreryMessage>) => deliver(event.data);
  worker.onerror = () => deliver({ type: 'error', message: 'The Orrery’s engine couldn’t start.' });
  return { post: (request) => worker.postMessage(request), close: () => worker.terminate() };
}

function mainThreadEngine(deliver: (message: OrreryMessage) => void): Engine {
  const host = createOrreryHost(deliver, () => performance.now());
  let frame: number | null = null;
  let last = 0;
  let closed = false;
  const loop = (now: number) => {
    host.tick(Math.min(0.1, (now - last) / 1000), 8);
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
