import { useCallback, useEffect, useRef } from 'react';
import { createCollisionHost, type CollisionMessage, type CollisionRequest } from '../../core/nbody/collisionHost';
import { createLocalGroupHost, type LocalGroupMessage, type LocalGroupRequest } from '../../core/galaxy/localGroupHost';

interface Host<Req> {
  receive(request: Req): void;
  tick(): void;
  readonly running: boolean;
}

interface Engine<Req> {
  post(request: Req): void;
  close(): void;
}

/**
 * Talks to an engine in a Web Worker (Chapter 31's colliding galaxies and
 * Local Group futures). Messages go to `onMessage`; requests sent before the
 * worker exists (it starts after the figure mounts) wait for it. Where
 * workers aren't available, the same host runs on the main thread, a few
 * milliseconds a frame.
 */
function useEngine<Req, Msg>(
  makeWorker: () => Worker,
  makeHost: (post: (message: Msg) => void) => Host<Req>,
  mainThread: (request: Req) => Req,
  onMessage: (message: Msg) => void,
): (request: Req) => void {
  const callback = useRef(onMessage);
  useEffect(() => {
    callback.current = onMessage;
  });
  const engine = useRef<Engine<Req> | null>(null);
  const queue = useRef<Req[]>([]);
  // The factories are module-level, so they never change
  const factories = useRef({ makeWorker, makeHost, mainThread });

  useEffect(() => {
    const deliver = (message: Msg) => callback.current(message);
    const { makeWorker: w, makeHost: h, mainThread: m } = factories.current;
    const e = typeof Worker === 'undefined' ? mainThreadEngine(h(deliver), m) : workerEngine(w(), deliver);
    engine.current = e;
    for (const request of queue.current) e.post(request);
    queue.current = [];
    return () => {
      e.close();
      engine.current = null;
    };
  }, []);

  return useCallback((request: Req) => {
    if (engine.current) engine.current.post(request);
    else queue.current.push(request);
  }, []);
}

function workerEngine<Req, Msg>(worker: Worker, deliver: (message: Msg) => void): Engine<Req> {
  worker.onmessage = (event: MessageEvent<Msg>) => deliver(event.data);
  worker.onerror = () => deliver({ type: 'error', message: 'The simulation couldn’t start.' } as Msg);
  return { post: (request) => worker.postMessage(request), close: () => worker.terminate() };
}

function mainThreadEngine<Req>(host: Host<Req>, adapt: (request: Req) => Req): Engine<Req> {
  let frame: number | null = null;
  let closed = false;
  const loop = () => {
    host.tick();
    frame = host.running && !closed ? requestAnimationFrame(loop) : null;
  };
  return {
    post(request) {
      host.receive(adapt(request));
      if (host.running && frame === null) frame = requestAnimationFrame(loop);
    },
    close() {
      closed = true;
      if (frame !== null) cancelAnimationFrame(frame);
    },
  };
}

const collisionWorker = () => new Worker(new URL('../../workers/collision.worker.ts', import.meta.url), { type: 'module' });
const collisionHost = (post: (message: CollisionMessage) => void) => createCollisionHost(post);
// On the main thread, a smaller budget per frame
const collisionMain = (request: CollisionRequest): CollisionRequest => (request.type === 'run' ? { ...request, budget: 8 } : request);

/** Figure 31.1's encounter engine (core/nbody/collisionHost.ts). */
export function useCollision(onMessage: (message: CollisionMessage) => void): (request: CollisionRequest) => void {
  return useEngine(collisionWorker, collisionHost, collisionMain, onMessage);
}

const localGroupWorker = () => new Worker(new URL('../../workers/localGroup.worker.ts', import.meta.url), { type: 'module' });
const localGroupHost = (post: (message: LocalGroupMessage) => void) => createLocalGroupHost(post, undefined, 8);
const same = (request: LocalGroupRequest) => request;

/** Figure 31.2's Local Group futures (core/galaxy/localGroupHost.ts). */
export function useLocalGroup(onMessage: (message: LocalGroupMessage) => void): (request: LocalGroupRequest) => void {
  return useEngine(localGroupWorker, localGroupHost, same, onMessage);
}
