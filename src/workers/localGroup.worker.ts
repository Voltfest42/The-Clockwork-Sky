import { createLocalGroupHost, type LocalGroupMessage, type LocalGroupRequest } from '../core/galaxy/localGroupHost';

/**
 * The Local Group's futures off the main thread (Figure 31.2): the host of
 * core/galaxy/localGroupHost.ts computes futures in batches; a zero timeout
 * between batches lets a new request through.
 */

// The project is type-checked with DOM types; inside a worker only these two members are used.
const worker = self as unknown as {
  onmessage: (event: MessageEvent<LocalGroupRequest>) => void;
  postMessage: (message: LocalGroupMessage) => void;
};

const host = createLocalGroupHost((message) => worker.postMessage(message));

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
