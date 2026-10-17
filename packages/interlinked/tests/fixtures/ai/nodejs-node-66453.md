`worker.isConnected()` and `worker.isDead()` describe their boolean result only in prose, so the doc tooling has no return type for them. This adds `* Returns: {boolean}` to both, the same way #65307 did for `fs.md`.

Both return `this.process.connected` and an exit/signal check (`lib/internal/cluster/worker.js`). I checked on v24 that they return `true`/`false` while the worker runs and `false`/`true` after it exits.

Written with AI assistance (see the `Assisted-by` trailer); I reviewed the change and ran the check above myself.
