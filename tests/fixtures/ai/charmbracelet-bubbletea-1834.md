## Problem

Running `go run .` in `tutorials/basics` or `tutorials/commands` (as well as `go test ./...` inside `tutorials/`) currently fails immediately with:

```text
go: updates to go.mod needed; to update it:
	go mod tidy
```

## Root Cause

`tutorials/go.mod` was pinned to Go 1.24.2 with outdated indirect dependencies that fell out of sync with the root `charm.land/bubbletea/v2` module (which was bumped to Go 1.26.0 in #1807). While `examples/go.mod` was updated in commit fc707bb, `tutorials/go.mod` was not tidied.

## Solution

1. Run `go mod tidy` in `tutorials/`, updating its Go directive to 1.26.0 and syncing checksums in `tutorials/go.sum`.
2. Add regression tests in `tutorials/basics/main_test.go` and `tutorials/commands/main_test.go` covering model initialization, updates, and views so `tutorials` packages are continuously verified by `go test ./...`.

Fixes #1371

## Verification

- `cd tutorials && go test -v ./...` (passes with both tests)
- `cd tutorials/basics && go run .` (runs without module error)
- `cd tutorials/commands && go test -v .` (passes)
- `go test -race -count=1 ./...` (all root package tests pass)
- `cd examples && go test ./...` (all examples compile and test cleanly)
- `go vet ./...` (passes across root, examples, and tutorials)
- `git diff --check` (clean, no trailing whitespace)