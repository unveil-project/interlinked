Calling `Flush()` before the first write commits the underlying response headers without letting `Compress` choose its encoding. A subsequent write can then produce gzip or deflate bytes without a `Content-Encoding` header.

Initialize the existing header path before flushing, just as `Write` already does. The regression test uses a real HTTP server and checks decoded body content, repeated flushes, explicit status codes, identity encoding and non-compressible content types.

Verified the regression fails against the original implementation, then ran `make test` (the full race suite), `go vet ./...` and goimports checks successfully on Go 1.26.4/macOS. The other Go versions and Windows CI matrix were not run locally.

Implemented and verified with AI assistance through Hermes Agent.
