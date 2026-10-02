#### Description

This is the deadlock from the batching correctness report in #16061, split into its own ticket (#16076) per the discussion there.

With `metadata_keys` set and `num_consumers: 1`, the first time the partition cache evicts an entry, the pool is dead. `workerPool.execute` grabs its token in the calling goroutine, so the worker running the evicted partition's `shutdownInternal` already holds the only token, and the final flush inside it calls `execute` again and waits on itself. Every flush after that blocks forever, but `Consume` keeps succeeding, so the collector keeps accepting telemetry it can't send. The existing test comment even notes eviction needs more than one worker.

The fix:

- `getPartition` now removes the oldest entry itself and schedules the evicted partition's shutdown after `mb.lock` is released, instead of the LRU callback firing synchronously inside `Add` while the lock is held.
- `shutdownInternal` got a `flushInline` flag: when it is already running on a pool worker (the eviction path, and the idle-timeout removal path), the pending batch is exported on that same goroutine instead of acquiring a second worker. Plain `Shutdown` still goes through the pool like before.
- Idle-timeout removals were relying on the LRU eviction callback for their shutdown (`Remove` fires it too), so once the callback went away their timer goroutine leaked. `onEmpty` now schedules the shutdown itself after dropping the partition from the cache. Found via the race detector.

#### Link to tracking issue

Fixes #16076

#### Testing

New `TestMultiBatcher_CacheSizeEvictionSingleWorkerNoDeadlock`: single worker, cache size 2, five partitions rotating through, asserts nothing blocks and every evicted batch still gets exported. `TestMultiBatcher_CacheSizeEviction` now runs with one worker too, since the old "more than one worker is required" comment is no longer true.

`go test -race ./internal/queuebatch/` passes, plus a bunch of `-count` reruns of just the MultiBatcher tests to shake out flakes. The only failures I see locally are `TestQueueBatch_Merge/split_disabled` and `split_high_limit`, which fail identically on a clean checkout of main, so as far as I can tell they're unrelated.

#### Documentation

Changelog entry added via `.chloggen`. No config or API changes.

#### Authorship

- [x] I, a human, wrote this pull request description myself.
