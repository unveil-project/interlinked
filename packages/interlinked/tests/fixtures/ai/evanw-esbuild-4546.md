## Problem

When `for await` is lowered, the generated loop stores a caught error in a function-scoped `var` with no initializer. If that loop sits inside another loop, the next entry still sees the previous error and the generated `finally` rethrows it — even when the later iteration completes normally.

Fixes #4544.

## Root cause

`lowerForAwaitLoop` emitted `for (var iter = …, more, temp, error; …)` without clearing `more` / `temp` / `error` on each entry. Those bindings are function-scoped, so an outer retry loop reused the stale `error` value.

## Fix

Initialize `more`, `temp`, and `error` to `void 0` in the for-init so each entry starts clean.

## Tests

- `TestLowerForAwaitErrorReset4544` in `bundler_lower_test.go` (fails without the initializer)
- Updated lowered snapshot in `snapshots_lower.txt`
- End-to-end runtime fixture in `scripts/end-to-end-tests.js` from the issue repro
- Verified with `--target=es2017`, `--supported:for-await=false`, `--supported:async-await=false`, and a minified `--target=es2017` build (`finished after 2 attempts`)

`go test ./internal/js_parser/...`, `go test ./internal/bundler_tests/...`, and `node scripts/end-to-end-tests.js` all pass.

## Scope

Parser lowering + tests + CHANGELOG unreleased note. No API changes.
