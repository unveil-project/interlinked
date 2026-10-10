Fixes #36937

**AI disclosure:** this change, the test and this description were written with Claude Code (an AI assistant from Anthropic). A second AI agent reviewed the diff.

## The problem

`Deno.watchFs` and `node:fs.watch` keep a count of watchers per path in `WatcherInner::watched_paths`, and `op_fs_events_open` only calls `watcher.watch()` when that count is 0. The count was released in `Drop for FsEventsResource`, but `Resource::close` only cancelled the token. `op_fs_events_poll` holds an `Rc` to the resource while it waits, so a watcher closed during a poll isn't dropped until that poll returns.

So when a directory is deleted and recreated, and the old watcher is closed and a new one opened on the same path in the same tick, the new one sees a stale count, skips `watch()`, and is never registered on the new directory. On Linux the kernel drops the old inotify watch together with the deleted directory, so the new watcher gets no events. chokidar does exactly this, so Vite's dev server stops seeing changes in that directory.

## The change

- `watched` is now a `Mutex<Vec<..>>`, and a new `FsEventsResource::release_watches()` takes it and runs the existing decrement/unwatch loop. Taking the vec makes it safe to call more than once.
- `close()` calls it, and `Drop` still calls it too, so a resource that is never closed is handled as before.
- Removing the sender from the dispatch list stays in `Drop`, so how an in-flight poll ends is unchanged.
- The registration part of `op_fs_events_open` (everything after the permission checks) moved unchanged into `open_fs_events_resource`. The `op2` macro defines the underlying function inside a const fn, so a test can't call the op itself.

## Testing

New unit test `closing_a_resource_releases_its_watch_while_it_is_still_referenced`. It opens a watcher, holds the resource the way an in-flight poll does, closes it, and checks the count is released. It then reopens the same path, drops the old resource, and checks that the late drop doesn't release the new watch. It fails without the change (`left: Some(1), right: None`) and passes with it.

Run locally on macOS (arm64):

- `cargo test -p deno_runtime -p deno_v8 --lib`: 39 passed
- `cargo fmt --check` and `cargo clippy -p deno_runtime -p deno_v8 --lib --tests` with the repo's deny flags: clean

What I did not do:

- I did not run the JavaScript reproduction from the issue against a patched `deno` build on Linux. The bug only shows with inotify, and my machine is macOS, so the test checks the watch accounting that causes it.
- I did not run the existing `tests/unit/fs_events_test.ts` cases, which need a built `deno`. Relying on CI for those.
