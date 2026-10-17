Since @mswjs/interceptors 0.41.7 (PR #778), `respondWith` in `src/interceptors/fetch/web.ts` always constructs `new FetchResponse(decompressedStream || rawResponse.body, ...)`. In React Native, the global `Response` implementation does not expose a public `.body` property, so `rawResponse.body` is `undefined`. The rebuilt response then has correct status and headers (including Content-Length) but an empty body, and consumers get `null` from `response.json()`.

This regressed the React Native setup described in mswjs/msw#2748, where MSW 2.14.0 broke mocked responses for both plain ky and RTK Query users. Pinning interceptors to 0.41.6 restores the old behavior.

Before 0.41.7, `respondWith` passed `rawResponse` through unchanged when no decompression applied, so the client read the body through the original Response object.

Two possible directions:

1. Preserve the old pass-through when there is no decompressed stream and the raw Response has no public `body`, so consumers read from the original object as before.
2. Keep the strict construction but throw a descriptive error when `rawResponse.body` is missing while the response declares content, so the failure is not silent.

Happy to prepare a PR for whichever direction you prefer.
