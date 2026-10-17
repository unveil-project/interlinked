- [x] I have read [`CONTRIBUTING.md`](https://github.com/charmbracelet/.github/blob/main/CONTRIBUTING.md).
- [ ] I have created a discussion that was approved by a maintainer (for new features). Not applicable: this is a bug fix with no new API.

## Problem

`ReleaseTerminal` always waits for `readLoopDone`, even when the program was created with `WithInput(nil)`. No input reader or read loop exists in that configuration, so the wait can only end at the hard-coded 500 ms timeout. This also delays commands run through `ExecProcess`, which releases the terminal first.

The regression calls `ReleaseTerminal` on a no-input program and fails on the unmodified `ff51ba4c51f85875761b15a64f9ab9aa0eaa9fa1` baseline:

```
--- FAIL: TestReleaseTerminalWithNilInputDoesNotWait (0.50s)
    exec_test.go:148: ReleaseTerminal took 500.652417ms without an input reader
```

## Change

Wait for the input read loop only in the same branch that has a `cancelReader` to cancel. Programs with an initialized reader retain the existing cancel-and-wait behavior; no-input programs proceed immediately.

A focused regression test pins the no-input behavior.

## Validation

- Baseline reproduction: `go test -run '^TestReleaseTerminalWithNilInputDoesNotWait$' -count=1 .` — failed as expected after about 500 ms.
- `go test -run '^TestReleaseTerminalWithNilInputDoesNotWait$' -count=10 .` — passed.
- `go test ./...` — passed.
- `go test -race ./...` — passed.
- `go vet ./...` — passed.
- `go run github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.9.0 run --timeout=10m` — passed with 0 issues.
- `(cd examples && go test ./...)` — passed; packages without tests compiled successfully.
- `git diff --check` — passed.
