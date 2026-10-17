Closes #4034

## Summary

`bat`'s main output path has exited quietly on `BrokenPipe` since #232 (writes → `Error::Io(BrokenPipe)` → `default_error_handler` → `exit(0)`). But several auxiliary output paths still use bare `println!`/`print!`/`.unwrap()` and panic with exit code 101 when stdout is a closed pipe:

```
bat --completion bash | head -n0
thread 'main' panicked at std/src/io/stdio.rs:1166:9:
failed printing to stdout: The pipe is being closed. (os error 232)
```

## Changes

Every affected output now goes through `write!`/`writeln!(io::stdout(), ...)` + `?`, propagating `Error::Io(BrokenPipe)` into the existing `default_error_handler` → quiet `exit(0)` — the same convention already used by `--config-dir`/`--cache-dir`/`--acknowledgements`:

- `--completion {bash,zsh,fish,ps1}` — match arms now select the `const`, one `writeln!`
- `--config-file`, `--generate-config-file` (`config.rs`)
- `--diagnostic` — `report.format::<Markdown>()` + `writeln!` (was `report.print::<Markdown>()` which prints via `println!` internally)
- `--set-terminal-title` — `print!` + `flush().unwrap()` → `write!?` + `flush()?`, signature now `Result<()>`
- `cache --clear`, `cache --build` (`assets.rs`, `build_assets.rs` — including the theme/syntax progress prints) and the `#[cfg(not(feature))]` availability notices — same panic class, same fix
- `tests/integration_tests.rs`: two regression tests using `std::io::pipe()` with a pre-closed read end (deterministic, stdlib-only, works on Windows where `os error 232` reaches the same `BrokenPipe` kind)

Non-EPIPE stdout errors now surface as `[bat error]: …` + exit 1 instead of panic-101 — consistent with the main path.

## Verification

- Windows 11 (`x86_64-pc-windows-gnu`): all 9 affected invocations → quiet exit 0 (previously panic, exit 101)
- Output byte-identical to the release binary for every flag
- `cargo fmt --check` clean; `cargo clippy --locked --all-targets --all-features` — no new warnings
- `cargo test`: 147 lib + 264 integration tests, 0 failures (includes the 2 new regression tests)
- CHANGELOG entry added per CONTRIBUTING
