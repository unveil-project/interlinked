<!--Ex. Fixing a bug - Describe the bug and how this fixes the issue.
Ex. Adding a feature - Explain what this achieves.-->
#### Description

Ran into #15422 while reading the queuebatch shutdown paths. A `Consume` that has already observed `active == true` releases `currentBatchMu` and only then calls `stopWG.Add(1)` inside `flush()`. If `shutdownInternal` makes it into `stopWG.Wait()` in between, the Add lands while Wait is returning from a zero counter and the collector panics with `sync: WaitGroup is reused before previous Wait has returned`. It's not just a shutdown-time nit either: `multiBatcher`'s LRU eviction callback dispatches `shutdownInternal` on the shared worker pool, so a partition can be shut down while another goroutine is still mid-`Consume` on it. That's the realistic trigger.

The fix serializes the Add against shutdown instead of trying to out-time it. `shutdownInternal` flips a new `stopping` flag under `currentBatchMu` right before `stopWG.Wait()`, and `flush()` holds the same mutex across its flag check + Add. Once the flag is set, flush exports on the caller's goroutine rather than handing the batch to a worker. No batch gets dropped (the downstream sender is still alive at that point; the wrapped exporter shuts down after the queue sender), and no Add can slip in after Wait starts observing.

One ordering detail matters: the mutex can't be held across `Wait`, because the timer goroutine is itself counted in `stopWG` and needs `currentBatchMu` inside `flushCurrentBatchOrRemovePartition`. Hold it and shutdown wedges. The first iteration of #15464 did exactly that and it was caught in review there.

Which brings me to the elephant in the room: this is basically a revival of #15464. That PR was approved back in June but its author went quiet and the stale bot closed it in September. Same fix shape, rebased onto current main, regression tests re-verified from scratch. Figured it's a shame to let an approved correctness fix rot while the panic is still reachable.

<!-- Issue number if applicable -->
#### Link to tracking issue
Fixes #15422

<!--Describe what testing was performed and which tests were added.-->
#### Testing

- `TestPartitionBatcher_FlushRacesWithShutdown`: 200 rounds of 8 concurrent `Consume` producers racing `Shutdown`, with `MinSize: 0` so every request flushes immediately and the Add/Wait overlap is as wide as possible. On unfixed main this crashes with the exact `WaitGroup is reused` panic from the issue, usually within a few iterations (verified locally). With the fix, 200/200 rounds pass under `-race` and every item is accounted for, none dropped, none errored.
- `TestPartitionBatcher_ConsumeAfterShutdownFlushesInline`: deterministic check that a flush landing after shutdown started waiting gets exported inline instead of dropped or sent to a worker.
- `TestPartitionBatcher_ShutdownDoesNotDeadlockWithFastTimer`: guards the lock-release-before-Wait ordering with a nanosecond flush timer.
- `go test -race ./internal/queuebatch/` is green and `golangci-lint run` is clean. Heads up: `TestQueueBatch_Merge` fails on my machine with and without this change (fails on clean main too, repeatedly), so I'm reading that as a pre-existing local timing flake. CI should confirm one way or the other.

<!--Describe the documentation added.-->
#### Documentation

Changelog entry via chloggen. Nothing else to document; behavior only changes in a window that previously panicked or risked dropping the batch.

<!--Authorship attestation. See AGENTS.md for details. AI agents must not check this box on behalf
of the user; the human author must check it themselves before the PR is ready for review.-->
#### Authorship

- [x] I, a human, wrote this pull request description myself.
