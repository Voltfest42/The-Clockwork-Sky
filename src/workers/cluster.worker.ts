import { createClusterHost, type ClusterMessage, type ClusterRequest } from '../core/nbody/clusterHost';

/**
 * A star cluster off the main thread (Figure 30.1): the host of
 * core/nbody/clusterHost.ts, fed by messages and ticked while it runs. Each
 * tick computes for a set budget and sends the stars' positions; a zero
 * timeout between ticks lets "pause" through.
 */

// The project is type-checked with DOM types; inside a worker only these two members are used.
const worker = self as unknown as {
  onmessage: (event: MessageEvent<ClusterRequest>) => void;
  postMessage: (message: ClusterMessage, transfer?: Transferable[]) => void;
};

const host = createClusterHost((message) => {
  if (message.type === 'state') worker.postMessage(message, [message.positions.buffer, message.bound.buffer]);
  else if (message.type === 'loaded') worker.postMessage(message, [message.masses.buffer]);
  else worker.postMessage(message);
});

let scheduled = false;

const loop = () => {
  scheduled = false;
  host.tick();
  if (host.running) schedule();
};

const schedule = () => {
  if (scheduled) return;
  scheduled = true;
  setTimeout(loop, 0);
};

worker.onmessage = (event) => {
  host.receive(event.data);
  if (host.running) schedule();
};
