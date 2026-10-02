## What?

`k6/websockets` now tags a failed connection the way the HTTP module tags a failed request:

- **No response at all** (refused connection, timeout, DNS or TLS failure): `status=0`, plus `error` and `error_code`, classified with the same codes as HTTP (for example `1212` for a refused connection).
- **Handshake answered with a 4xx or 5xx status**: `error_code` is `1000 + status` (for example `1404`), next to the `status` tag that was already set.

The tags go on the `ws_sessions` and `ws_connecting` samples that are already emitted for every connection attempt.

To share the classification, `lib/netext/httpext` gets a small exported `ErrorCodeAndMessage(err) (int, string)`, a wrapper around the existing unexported `errorCodeForError`. The `errCode` type and its constants stay unexported.

## Why?

As #4770 (and #2024 before it, for the old `k6/ws` module) describes, a WebSocket that fails to connect today emits no `status` tag and no `error`/`error_code`. So it can't be told apart from a successful connection in thresholds or outputs, unlike an HTTP request that fails the same way.

## Checklist

- [x] I have performed a self-review of my code.
- [x] I have commented on my code, particularly in hard-to-understand areas.
- [x] I have added tests for my changes. `TestConnectionErrorTags` covers both cases; it fails on `master` and passes here.
- [x] I have run linter and tests locally and all pass. I ran golangci-lint with the repository's config on the changed packages, plus `go test -race` for `websockets`, `httpext` and the `http` module. I did not run the full `make check`.

## Related PR(s)/Issue(s)

Closes #4770

I used an AI assistant while preparing this PR; I reviewed and tested the change myself.
