## Description

Fixes #13347.

When `: ping` and subsequent data events arrive in the same chunk, `streamSse` stops draining the buffer. At EOF, the remaining events can be silently dropped. Remove the special completion branch so ping comments follow the existing ignored-line path; `[DONE]` handling is unchanged.

This carries forward the fix from #13187, which its author withdrew and explicitly invited others to reopen or cherry-pick. The regression coverage here includes leading, interleaved, split and consecutive heartbeats, plus trailing-heartbeat and other-comment controls. A local HTTP server reproduced the dropped events before the fix and yielded both events after it.

## Checklist

- [x] I've read the contributing guide.
- [x] Relevant tests have been added.
- [x] No documentation change is needed for this correction to existing streaming behavior.

## Tests

In `packages/fetch`, using the locked dependencies and Node.js 24.17.0:

- The new cases on the original source: 4 failed; the other 13 stream tests passed.
- `npm test -- --reporter=verbose`: all 103 package tests passed, including local HTTP/TLS tests.
- `npm run build`: passed after building the local `config-types` dependency in the order used by `scripts/build-packages.js`.
- Root Prettier check for both changed files and `git diff --check`: passed.

Validation covers the fetch package and local HTTP responses. I did not run the full IDE/GUI suites or call an external model provider. No UI change, so a screen recording is not applicable.
