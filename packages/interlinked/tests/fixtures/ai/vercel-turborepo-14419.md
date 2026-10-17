### Description

Zig 0.15.2 cannot link the Ghostty build runner against the macOS 26 SDK. This retains the original PR's macOS libc-symbol protection and upgrades the compiler, native library, and Rust bindings together to Zig 0.17.

Zig 0.16 resolved the macOS SDK linking failure, but its native Windows ARM64 compiler crashed with an access violation. Running the x64 compiler under emulation to produce ARM64 output then hit a standard-library pointer-alignment compile error. This is why the upgrade moves to Zig 0.17 instead of stopping at 0.16.

- Pin Zig to `0.17.0` and Ghostty to `5147c0a503cdeed7615cce245cdd815ed7a6b692`, from [Ghostty's Zig 0.17 migration](https://github.com/ghostty-org/ghostty/pull/14519).
- Pin the compatible Rust wrapper to `3c7766d4e5d6ce93870ad666a14c0b5a0e957360`, from [libghostty-rs #84](https://github.com/Uzaaft/libghostty-rs/pull/84), and update the local FFI bindings, signed enums, and binding generator.
- Adapt terminal construction and scrollback configuration while preserving zero-scrollback behavior and the default byte cap for positive line limits.
- Keep baseline CPU targeting and aligned macOS deployment targets. Explicitly pass Windows targets so compiler architecture and output architecture need not match.
- Localize libc symbols across archive members and fail if the guarded symbols remain exported. Apply protection to build-owned output archives so `GHOSTTY_SOURCE_DIR` checkouts do not need to be rewritten.
- Update CI, devcontainer, and factory Zig pins together. Remove `terminal-control` and use a focused test-only adapter around the existing `portable-pty` and Ghostty dependencies for the black-box TUI tests. No vendored library, personal fork, or alternate terminal parser is required.

```text
Zig 0.17.0
  └─ Ghostty libghostty-vt @ 5147c0a5
       └─ Local FFI bindings + Rust wrapper @ 3c7766d4
            ├─ Turborepo TUI
            └─ TUI tests: existing portable-pty + Ghostty
```

The test-only adapter in `crates/turborepo/tests/common/tui.rs` handles only the PTY lifecycle, Ghostty screen capture, terminal-query responses, raw output, input, and resizing needed by these tests. All seven existing TUI scenarios retain their assertions, input actions, and deadlines; only harness imports and plumbing change. Focused regressions cover color/escape parsing, query responses and final output, and timeout/drop cleanup. Removing the library and its unused CLI, MCP, and image-rendering dependency tree eliminates 52 lockfile packages. Production and tests continue to use the same Ghostty wrapper and native library. Most of the remaining added source is generated C bindings.

Both upstream dependency revisions are currently unmerged PR commits. They are pinned by full commit ID rather than floating branches.

### Manual verification

A native ARM64 Windows executable was exercised in a Windows 11 Parallels VM through a real ConPTY session. Startup, task output, interactive input, return to navigation, resizing, Ctrl-C shutdown, and alternate-screen restoration all worked.

The macOS source-override path was exercised with a fresh Ghostty checkout. The build completed without changing its tracked source files.

The local Windows x64 Zig build-runner experiment under Windows-on-ARM emulation stalled and was stopped at the maintainer's request; that experiment is not presented as passing manual verification.
