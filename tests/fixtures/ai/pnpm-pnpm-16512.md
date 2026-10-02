## Summary

Closes pnpm/pnpm#16508.

Since 12.6.0, every install takes a shared store operation lock through `File::lock_shared`. On Rust 1.97, which this repo pins, std returns `Unsupported` for `File::lock`, `File::lock_shared`, and `File::try_lock` on Android, so `pnpm install` on Termux fails with `ERR_PNPM_STORE_DIR_ACQUIRE_OPERATION_LOCK`. Android does have `flock`, and std calls it from Rust 1.98 on.

The store lock is not the only std file lock on that path: `pnpm install` also takes the metadata transaction lock (`install-coordinator`) with `File::lock`, which fails the same way once the store lock succeeds. `main` already had `pnpm_fs::lock_file` and `pnpm_fs::try_lock_file` for the WASI build, with a cfg pair at each call site. They now exist on every target: `libc::flock` on Android, std elsewhere, host leases on WASI. Every file lock goes through them: the store operation lock, the metadata transaction lock, `DirLock`'s held file, private installs, concurrency-group slots, and the pipeline agent lock.

I bumped the toolchain to 1.98.1 first, but clippy then fails on new lints in unrelated crates, so the fallback stays in `pnpm_fs` until the toolchain moves.

How I checked: I ran `cross test --target aarch64-linux-android -p pnpm-store-dir --lib store_lock` with the NDK r25b image from `Cross.toml`. On `main`, the four tests that take the lock fail with the error from the issue (`lock_shared() not supported`). With the store-lock change, all 8 pass. `pnpm-fs` passes clippy for `aarch64-linux-android` and builds for `wasm32-wasip1-threads`. Host tests for `pnpm-fs`, `pnpm-store-dir`, `pnpm-install-coordinator`, and the concurrency-group suite pass.

## Squash Commit Body

```text
Rust 1.97's File::lock, File::lock_shared, and File::try_lock return
Unsupported on Android, so every install there failed to take the store
operation lock added in 12.6.0, and then the metadata transaction lock.
Android has flock, and std uses it from Rust 1.98 on.

pnpm_fs::lock_file and try_lock_file existed only for the WASI build.
Provide them on every target, calling libc::flock on Android and std
elsewhere, and route every file lock through them: the store operation
lock, the metadata transaction lock, directory locks, private installs,
concurrency-group slots, and the pipeline agent.

Closes pnpm/pnpm#16508
```

## Checklist

- [x] I checked the referenced issue and verified that none of the PRs
  already linked to it solves it.
- [x] New features are implemented only in the Rust pnpm v12 CLI. Bug fixes
  are implemented in every affected version.
- [x] Added a changeset (`pnpm changeset`) if this PR changes any published
  package. Keep it short and written for pnpm users — it becomes a release note.
- [x] Added or updated tests.

---
Written by an agent (Claude Code, claude-opus-5-5).


<!-- This is an auto-generated comment: release notes by coderabbit.ai -->

## Summary by CodeRabbit

* **Bug Fixes**
  * Fixed Android installation failures caused by store lock acquisition errors.
  * Improved file-lock handling across package installation, store management, and concurrent operations to help ensure locks are acquired and released consistently across supported platforms.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->
