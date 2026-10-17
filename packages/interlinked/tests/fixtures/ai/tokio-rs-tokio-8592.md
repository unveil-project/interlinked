## Motivation

Closes #7240.

A `watch` producer can use `Sender::closed()` to stop work when its last receiver leaves, but it cannot await a new subscriber without maintaining another notification mechanism. Add `Sender::opened()` so it can wait for interest before starting or resuming work.

## Solution

`opened()` checks the receiver count around creating a notification future, then rechecks it after waking. It participates in cooperative scheduling and mirrors `closed()`'s behavior for transient receiver-count changes.

Reuse the existing sender notifier and notify only when the receiver count changes from zero to one. Construct the `Receiver` before waking tasks so its normal drop path restores the count if a subscriber's waker panics.

Coverage includes an existing receiver, reopening, multiple waiting senders, transient subscriptions, cancellation, repeated close/reopen cycles, panicking wakers, cooperative scheduling, and the existing `closed()` behavior. Add auto-trait assertions and Loom models for concurrent subscription and multiple waiters.

## Validation

Validated natively on Windows `x86_64-pc-windows-msvc` with Rust/Cargo 1.98.1, one build job and one test thread:

- Baseline regression fails to compile without `opened()` (E0599). Removing the zero-to-one notification fails the wake assertion. An earlier implementation failed the panic-waker receiver-count regression; the final implementation passes it.
- `cargo test -p tokio --features full --test sync_watch --test async_send_sync`: 32 watch tests pass; auto-trait assertions compile successfully.
- `cargo test -p tokio --features full --test 'sync_*'`: 399 tests pass across 19 binaries, including the watch tests above.
- `cargo test -p tokio --features full --doc sync::watch`: 24 documentation tests pass, including the new example.
- `cargo check -p tokio --no-default-features --features sync`: passes.
- `cargo clippy -p tokio --features full --lib --test sync_watch --test async_send_sync -- -D warnings`: passes.
- `rustfmt --check --edition 2021` on the four changed files and `git diff --check`: pass.
- `cargo test -p tokio --lib --release --features full sync::tests::loom_watch -- --test-threads=1`: all six watch models pass. This bounded Loom run uses the CI configuration `LOOM_MAX_PREEMPTIONS=2`, `LOOM_MAX_BRANCHES=10000`, and `RUSTFLAGS='--cfg loom --cfg tokio_unstable -C debug_assertions -Dwarnings'`.

### Remote CI

The FreeBSD i686 and x86_64 jobs currently fail while compiling `nix 0.31.3`: `libc 0.2.190` lacks `NOTE_PCTRLMASK`. The same error is already present on the unchanged base commit `b2636752450484955e7ad334bac678424d51bc4a` in both [FreeBSD i686](https://github.com/tokio-rs/tokio/actions/runs/37209168997/job/111457111691) and [FreeBSD x86_64](https://github.com/tokio-rs/tokio/actions/runs/37209168997/job/111457111791). This PR does not change dependencies. Other remote checks are still running; the local validation above is complete.
This contribution was developed with AI assistance.