## Summary

`Collection::restore_shard_snapshot` spawned the long-running restore work onto the runtime, but moved the `OwnedRwLockReadGuard` of `shards_holder` into the spawned task. The restore unpacks the snapshot archive, restores segment files, drains the shard being replaced, and loads the recovered shard. The original PoC measured a 2.86 s hold on a 1 GiB padded snapshot; real shards reach hundreds of gigabytes (`#8671`), which puts the window in minutes.

`tokio::sync::RwLock` is write-preferring, so any writer that queues during the restore stalls. The next consensus-driven write that applies through `update_strict_mode_config` (e.g. a strict-mode `UpdateCollection`) takes the same lock's write side and fences every collection reader for the entire restore. Searches, scrolls, collection info, and update routing on that collection all block; the consensus thread applies entries serially and is the most visible casualty.

The spawned restore never needed the outer lock in the first place:

- `ShardReplicaSet::restore_snapshot` and `restore_local_replica_from` operate on the cloned `Arc` of the replica set.
- The `payload_index_schema` write goes through its own internal `parking_lot` synchronization.

## Fix

1. **`Collection::restore_shard_snapshot`** acquires the read lock only long enough to validate the shard exists and clone the `replica_set` `Arc` plus a `Vec<Arc<ShardReplicaSet>>` of every shard (needed for the partial-recovery `update_payload_index_schema` recompute), then drops the lock before spawning the restore.

2. **`ShardHolder::restore_shard_snapshot`** no longer takes `&self`. It now takes the cloned `replica_set: Arc<ShardReplicaSet>` and `all_shards: Vec<Arc<ShardReplicaSet>>` directly and uses them for the unpack, the local-replica restore, and (for partial recovery) the payload-index-schema recompute. This is the only caller of the method, so the signature change is contained.

3. **`ShardHolder::common_payload_index_schema`** is factored to delegate to a new `common_payload_index_schema_for(&[Arc<ShardReplicaSet>])` helper that takes the cloned slice, so the partial-recovery schema recompute runs without the holder lock. The `&self` form is preserved as a thin wrapper for the two existing callers (`update_payload_index_schema` and the test surface).

## Files

- `lib/collection/src/collection/snapshots.rs` — `Collection::restore_shard_snapshot` reworked to drop the read lock before spawning, and pass the cloned `Arc`s into the helper.
- `lib/collection/src/shards/shard_holder/mod.rs` — `restore_shard_snapshot` reworked to take the cloned state; `common_payload_index_schema` factored to expose a lock-free `_for(&[...])` helper.

## Verification

- `cargo check -p collection -p shard`: clean.
- `cargo +nightly fmt --all`: applied.
- `cargo +nightly clippy -p collection`: clean (only a pre-existing warning in `lib/segment`).
- `cargo test` blocked locally by workspace path containing a space (autotools-based `protobuf-src` build); CI will run the full suite. The original reporter's PoC at `lib/storage/tests/restore_shard_snapshot_holder_guard.rs` is the integration target.

## Notes

- `consult-kiro` skipped per documented 25+ consecutive wholesale-failure precedent in this session.
- Branched from `aee025067` (pre-`#10818` dependabot workflow bump) to avoid the OAuth `workflow`-scope push blocker that has affected forward-rebases since cycle 30.
- Forward-rebase to current `dev` (`9ae05efc`, +43 commits vs `aee025067`) is straightforward: the only changes between `aee025067` and `dev` touching this code are `33abb78a1` (`Cleanup`, partial rewrite of `start_shard_transfer` lines 182-200, unrelated) and the PoC-driven lock-hold observation in `#10850`. `ShardHolder::restore_shard_snapshot` is untouched upstream; the merge is clean.
- Companion issue: `#10847` (Raft snapshot application holds the ToC write lock) is being addressed by `ffuugoo` in PR `#10891`, so this PR only addresses `#10850`.

Fixes #10850
