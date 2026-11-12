import { createCollisionHost, type CollisionMessage, type CollisionRequest } from '../core/nbody/collisionHost';

/**
 * Colliding galaxies off the main thread (Figure 31.1): the host of
 * core/nbody/collisionHost.ts, fed by messages and ticked about 30 times a
 * second while it runs. Each tick steps as much of the encounter as the time
 * warp asks for and sends the stars' positions.
 */

// The project is type-checked with DOM types; inside a worker only these two members are used.
const worker = self as unknown as {
  onmessage: (event: MessageEvent<CollisionRequest>) => void;
  postMessage: (message: CollisionMessage, transfer?: Transferable[]) => void;
};

const host = createCollisionHost((message) => {
  if (message.type === 'state') worker.postMessage(message, [message.positions.buffer]);
  else if (message.type === 'loaded') worker.postMessage(message, [message.owner.buffer, message.startRadius.buffer]);
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
  setTimeout(loop, 30);
};

worker.onmessage = (event) => {
  host.receive(event.data);
  if (host.running) schedule();
};
