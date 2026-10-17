### Root cause

`preload()` never checks the serialized key. With a falsy key (`null`, `false`, an empty array, or a key function that throws because its dependencies are not ready), `serialize()` returns `''` and `preload` still calls `fetcher(fnArg)`, so the fetcher runs with that falsy value (for example `fetch('')` requests the current page). The result is also stored in `PRELOAD['']`, so every later `preload()` with a falsy key returns that same stale promise, even with a different fetcher.

`useSWR` treats a falsy key as "not ready" and never calls the fetcher, so ``preload(user ? `/api/user/${user.id}` : null, fetcher)`` behaves differently from the hook it is meant to warm up.

### Fix

Return early from `preload` when the serialized key is empty, the same way it already returns `undefined` on the server.

### Test

Added `should not call the fetcher when the key is falsy` to `test/use-swr-preload.test.tsx`. It calls `preload(null, fetcher)` and `preload(() => { throw ... }, fetcher)` and expects the fetcher not to be called. Before the fix it fails with `Received number of calls: 1` (called with `null`); after the fix the whole preload suite passes.
