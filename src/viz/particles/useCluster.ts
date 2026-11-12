import { useCallback, useEffect, useRef } from 'react';
import { createClusterHost, type ClusterMessage, type ClusterRequest } from '../../core/nbody/clusterHost';

interface Engine {
  post(request: ClusterRequest): void;
  close(): void;
}

/**
 * Talks to the many-body engine in a Web Worker (core/nbody/clusterHost.ts).
 * Messages go to `onMessage`; requests sent before the worker exists (it
 * starts after the figure mounts) wait for it. Where workers aren't
 * available, the same host runs on the main thread, a few milliseconds a
 * frame.
 */
export function useCluster(onMessage: (message: ClusterMessage) => void): (request: ClusterRequest) => void {
  const callback = useRef(onMessage);
  useEffect(() => {
    callback.current = onMessage;
  });
  const engine = useRef<Engine | null>(null);
  const queue = useRef<ClusterRequest[]>([]);

  useEffect(() => {
    const deliver = (message: ClusterMessage) => callback.current(message);
    const e = typeof Worker === 'undefined' ? mainThreadEngine(deliver) : workerEngine(deliver);
    engine.current = e;
    for (const request of queue.current) e.post(request);
    queue.current = [];
    return () => {
      e.close();
      engine.current = null;
    };
  }, []);

  return useCallback((request: ClusterRequest) => {
    if (engine.current) engine.current.post(request);
    else queue.current.push(request);
  }, []);
}

function workerEngine(deliver: (message: ClusterMessage) => void): Engine {
  const worker = new Worker(new URL('../../workers/cluster.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<ClusterMessage>) => deliver(event.data);
  worker.onerror = () => deliver({ type: 'error', message: 'The simulation couldn’t start.' });
  return { post: (request) => worker.postMessage(request), close: () => worker.terminate() };
}

function mainThreadEngine(deliver: (message: ClusterMessage) => void): Engine {
  const host = createClusterHost(deliver);
  let frame: number | null = null;
  let closed = false;
  const loop = () => {
    host.tick();
    frame = host.running && !closed ? requestAnimationFrame(loop) : null;
  };
  return {
    post(request) {
      host.receive(request.type === 'run' ? { ...request, budget: 8 } : request);
      if (host.running && frame === null) frame = requestAnimationFrame(loop);
    },
    close() {
      closed = true;
      if (frame !== null) cancelAnimationFrame(frame);
    },
  };
}
