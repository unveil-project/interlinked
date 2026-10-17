Fixes #1313

`zoxide query -i` panics when its stdout is a closed pipe:

```
zoxide query -i | head -n0   # fzf present, picks an entry
thread 'main' panicked at std/src/io/stdio.rs: failed printing to stdout: (os error 232)
```

The interactive path prints the fzf selection with bare `print!` (`src/cmd/query.rs`), which panics on EPIPE — the two sites that #137's `pipe_exit` sweep missed. `query --list` and `zoxide init` already exit quietly.

**Change** (`src/cmd/query.rs`, +4/−3): both `print!` calls → `write!(stdout, ...)` through the existing `pipe_exit("stdout")` helper, and the tail `Ok(())` becomes `stdout.flush().pipe_exit("stdout")` so a buffered EPIPE still surfaces deterministically. Same convention as the other fixed sites.

## Verification

- Windows 11 (`x86_64-pc-windows-gnu`, with an fzf stub on PATH): `query -i` and `query -i --score` on a closed stdout → quiet exit 0 (previously panic, exit 101); output on a live pipe unchanged (`write!` preserves `print!` semantics, no stray newline).
- `cargo fmt --check` clean; `cargo clippy` clean; `cargo test`: 16/16 pass.
