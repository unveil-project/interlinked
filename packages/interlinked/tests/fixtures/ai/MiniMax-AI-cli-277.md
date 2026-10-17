At `main` commit `06e47c70b76f419196678367dae62acca4c94076`, the streaming implementations of [`text.chat()`](https://github.com/MiniMax-AI/cli/blob/06e47c70b76f419196678367dae62acca4c94076/src/sdk/text/index.ts#L9-L28) and [`speech.synthesize()`](https://github.com/MiniMax-AI/cli/blob/06e47c70b76f419196678367dae62acca4c94076/src/sdk/speech/index.ts#L110-L119) create an HTTP response internally and delegate to `Client.streamSSE()`. If a caller stops consuming after an event, the iterator exits without cancelling that response body. The caller receives only the iterator, so cannot directly cancel the internal response.

[`Client.streamSSE()`](https://github.com/MiniMax-AI/cli/blob/06e47c70b76f419196678367dae62acca4c94076/src/sdk/client.ts#L37-L49) also breaks on `[DONE]` without cleanup. Its underlying `parseSSE()` only releases the reader lock in `finally`.

## Offline reproduction of the shared parser path

Run from the repository root with Node.js 24.19.0. This imports unchanged source and makes no API request:

```sh
node --input-type=module <<'JS'
import { parseSSE } from './src/client/stream.ts';

let cancelled = false;
const body = new ReadableStream({
  start(controller) {
    controller.enqueue(new TextEncoder().encode('data: first\n\n'));
  },
  cancel() { cancelled = true; },
});

for await (const event of parseSSE(new Response(body))) {
  console.log(event.data);
  break;
}
console.log({ cancelled, locked: body.locked });
await body.cancel(); // Clean up the deliberately open probe stream.
JS
```

Actual output:

```text
first
{ cancelled: false, locked: false }
```

A separate loopback HTTP check of the same parser confirmed that the server continued sending events after the consumer exited; explicitly calling `response.body.cancel()` then closed the connection. Normal EOF and original read-error propagation passed as controls. These checks used synthetic data and no credentials or paid API calls; they do not establish provider-side generation or billing behavior.

## Proposed scope

Would you accept a focused fix to release SDK-owned SSE responses when iteration stops early, including the helper's `[DONE]` path? I would like to confirm whether you prefer cleanup in `Client.streamSSE()` or in the shared parser, since a direct parser caller supplies its own `Response`.

The [`transcribeStream()` wrapper](https://github.com/MiniMax-AI/cli/blob/06e47c70b76f419196678367dae62acca4c94076/src/sdk/speech/index.ts#L193-L219) already cancels its body on exit for this reason. Regression coverage could include early break/return, `[DONE]`, normal EOF, read failures and rejecting cleanup, while preserving existing errors and releasing reader locks.

AI assistance was used for source inspection and local reproduction. No fix has been implemented or submitted. Open #276 changes line-ending parsing in the same parser; its current patch does not add response cleanup.
