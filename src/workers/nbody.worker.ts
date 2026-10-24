import { createHost, type NBodyMessage, type NBodyRequest } from '../core/nbody/protocol';

/**
 * The n-body engine off the main thread: the protocol's host, fed by messages
 * and ticked by a timer while a simulation runs.
 */

// The project is type-checked with DOM types; inside a worker only these two members are used.
const worker = self as unknown as {
  onmessage: (event: MessageEvent<NBodyRequest>) => void;
  postMessage: (message: NBodyMessage, transfer?: Transferable[]) => void;
};

const host = createHost((message) => {
  if (message.type === 'state') worker.postMessage(message, [message.x.buffer, message.v.buffer, message.trail.buffer]);
  else worker.postMessage(message);
});

let timer: ReturnType<typeof setInterval> | null = null;
let last = 0;

const stop = () => {
  if (timer !== null) clearInterval(timer);
  timer = null;
};

worker.onmessage = (event) => {
  host.receive(event.data);
  if (!host.running) return stop();
  if (timer !== null) return;
  last = performance.now();
  timer = setInterval(() => {
    const now = performance.now();
    host.tick(Math.min(0.1, (now - last) / 1000));
    last = now;
    if (!host.running) stop();
  }, 16);
};
