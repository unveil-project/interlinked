### What does this PR do?

Makes the metrics middleware also read `Grpc-Status` from `http.TrailerPrefix + "Grpc-Status"` when the plain header is empty.

### Motivation

Fixes #14005

When a backend sends `grpc-status` as a trailer without announcing it in a `Trailer` header (Kestrel does this), the reverse proxy writes it to the response headers as `Trailer:Grpc-Status`. `grpcStatusCode` only looked at `Grpc-Status`, so every successful call was recorded with `code="2"` (Unknown). Trailers-only error responses were fine because their status is a real header.

### More

- [x] Added/updated tests
- [ ] Added/updated documentation

### Additional Notes

