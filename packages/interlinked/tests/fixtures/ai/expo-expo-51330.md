# Why

On web, synchronous calls throw `Error: [object Object]` instead of the SQLite error. For example, `closeSync()` with an unfinalized statement doesn't say `unable to close due to unfinalized statements`.

The worker writes sync results to a shared buffer as JSON. `JSON.stringify` turns an `Error` into `{}`, so the message is lost.

The same buffer has a second bug: the length prefix only keeps the low byte, so a sync result or error longer than 255 bytes fails with a JSON parse error. A result larger than the 1 MB buffer throws inside the worker, and the caller waits until `Sync operation timeout`.

# How

- Send the error as a string, `error.message || String(error)`, so an empty message still throws. The async path sends the same string, so `closeAsync()` and `closeSync()` now throw the same message. Async errors used to start with an extra `Error: `.
- Write the length with a `Uint32Array` view.
- If a result doesn't fit in the buffer, throw an error that says to use the async API.

# Test Plan

- Added `WorkerChannel-test.web.ts`: error message, empty message, sync and async give the same message, 300-byte result, 300-byte error, and a 1 MB result. Each one failed before the fix and passes after it.
- All 71 SQLite test-suite specs pass on web in bare-expo.
- In the next PR, the web fts4 and fts5 tests check the sync error message instead of only checking that it throws.

# Checklist

- [x] Changeset added
- [x] `et check-packages expo-sqlite`
- [x] No docs change needed

🤖 Generated with [Claude Code](https://claude.com/claude-code)
