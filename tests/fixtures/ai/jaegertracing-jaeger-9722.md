## Summary

Remote gRPC storage copied incoming trace ID bytes into a 16-byte array. An 8-byte ID therefore landed in the high half, the opposite of `model.TraceIDFromBytes`. This is M1 from #9717.

The handler (`GetTraces`) and the reader (`FindTraceIDs`) now parse those bytes with `model.TraceIDFromBytes` and convert the result to `pcommon.TraceID`. 16-byte IDs are unchanged. 8-byte IDs sit in the low half. Any other length is rejected instead of being truncated or zero-padded into the high half.

## Motivation

#9717 asks for this as an independent bug fix. No Jaeger client sends 8-byte IDs today, but a client that does would get a trace ID that matches nothing.

## Testing

`go test ./internal/storage/v2/grpc/ -count=1` passed (Go 1.27.0).

Covered:
- 16-byte IDs still round-trip
- 8-byte IDs are placed in the low half on both the handler and the reader
- 1-byte and 17-byte IDs return `invalid length for TraceID`

I did not run `make lint` or the full test suite.

## AI usage

- [x] I used an AI assistant to draft this change. I reviewed the diff, ran the package tests, and can explain the conversion.

Part of #9717 (M1 only; M2-M4 are not included).
