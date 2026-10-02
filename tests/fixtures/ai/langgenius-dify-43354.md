## Summary

PTY reads can split a valid UTF-8 character between successive `Feed` calls. The sanitizer currently decodes each chunk independently, replacing incomplete character prefixes with U+FFFD and permanently corrupting the captured output.

Retain a copy of the incomplete UTF-8 suffix and prepend it to the next chunk. At EOF, process each remaining byte as U+FFFD through the existing ANSI/carriage-return state before resetting it, preserving the current invalid-byte behavior. The retained suffix is at most three bytes; no new dependencies are required.

Fixes #43349

## Screenshots

This is a terminal-output change. With the same byte-at-a-time PTY input, the native runtime produces:

| Before | After |
| ------ | ----- |
| `������ ����` | `世界 🌍` |

## Testing

- `make test` in `dify-agent-runtime/`: `golangci-lint run ./...` reports 0 issues; `go test ./...` passes.
- Added regression tests for 2/3/4-byte characters, an encoded U+FFFD, every two-chunk split point, empty chunks, malformed bytes, ANSI/OSC, CR/CRLF, incomplete EOF, repeated `Flush`, and 1–5-byte reads through `Run` with a reused buffer. The new boundary tests fail on the original implementation and pass with this fix.
- Additional local equivalence checks: 182,697 input/partition combinations match the original sanitizer processing the complete input in one call, including caller-buffer overwrites between chunks.
- Native Linux runtime acceptance: real HTTP API, SQLite jobs, tmux PTY, runner and sanitizer executables, `output.log`, and run/wait responses. The original executable reproduces corruption; the fixed executable preserves the identical input. Six fixed scenarios pass, including ANSI/CR, EOF, multiple HTTP output windows, and a line larger than 64 KiB. All jobs exit with code 0, and HTTP output matches `output.log` exactly.
- Docker acceptance and upper-level Agent/model integration were not run.

## Checklist

- [ ] This change requires a documentation update, included: [Dify Document](https://github.com/langgenius/dify-docs)
- [x] I understand that this PR may be closed in case there was no previous discussion or issues. (This doesn't apply to typos!)
- [x] I've verified the change and added or updated tests where meaningful regression risk justifies coverage.
- [ ] I've updated the documentation accordingly.
- [ ] I ran `make lint && make type-check` (backend) and `vp staged` (frontend) to appease the lint gods

Documentation, Python backend, and frontend checks are not applicable to this Go-runtime-only fix. Validation uses the runtime's `make test` target.
