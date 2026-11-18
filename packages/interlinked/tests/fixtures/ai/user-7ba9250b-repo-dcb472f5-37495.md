## Current Behavior

`nx reset` calls `rmSync(cacheDir, { recursive: true, force: true })` on the configured cache directory. Because `cacheDirectory` (or `NX_CACHE_DIRECTORY`) can point at a directory that also holds other files, reset wipes the directory and everything in it, including files Nx never wrote.

## Expected Behavior

`nx reset` removes only the entries Nx itself puts in the cache directory and leaves the directory and anything else inside it alone:

- task-hash output directories (decimal xxh3 hashes, plus older hex hashes)
- `<hash>.commit` markers and `<hash>.tar.zst` archives
- `terminalOutputs/`, `batchOutputs/`, and `run.json`
- `.nx-write-probe-*` files
- versioned database files (`{id}-v{schema}.db` and its `-wal` / `-shm` / `-journal` / `.lock` companions)

A regular file that happens to have a hash-like name is kept, since Nx stores task outputs as directories. Symlinks are unlinked rather than followed, and if the cache path itself is a symlink it is left in place. When the shared cache is active, the checkout's own `.nx/cache` gets the same treatment instead of being deleted wholesale.

Tests: added `reset-cache-entries.spec.ts` covering what is and isn't removed, and updated `reset.spec.ts`. Both pass with vitest, and the prepush checks (format, lint, commit message) pass.

## Related Issue(s)

Fixes #37467