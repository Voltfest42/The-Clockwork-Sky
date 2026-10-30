import { computeStellar, type StellarAnswer, type StellarRequest } from '../core/stellar/requests';

/** The stellar-evolution engine off the main thread: isochrones, fate curves and whole lives, one request at a time. */

// The project is type-checked with DOM types; inside a worker only these two members are used.
const worker = self as unknown as {
  onmessage: (event: MessageEvent<{ id: number; request: StellarRequest }>) => void;
  postMessage: (message: { id: number; answer?: StellarAnswer; error?: string }) => void;
};

worker.onmessage = (event) => {
  const { id, request } = event.data;
  try {
    worker.postMessage({ id, answer: computeStellar(request) });
  } catch (e) {
    worker.postMessage({ id, error: String(e) });
  }
};
