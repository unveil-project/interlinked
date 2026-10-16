## What happens
The A2A webhook handler (`/a2a/v1`) reflects the `jsonrpc` version and `id` from the request directly in the response without validation. While the `id` is typed as `string | number | null`, a maliciously crafted request with an extremely large `id` value (e.g., a 10MB string) could cause memory pressure when serialized in the response, as the response body limit (1 MiB) is applied after the RPC response object is constructed.

## File affected
- `extensions/a2a/src/http.ts:34-38,71-91`

## Vulnerable code
```typescript
// extensions/a2a/src/http.ts:34-38
type A2aRpcIdentifier = string | number | null;

type A2aRpcResponse =
  | { jsonrpc: "2.0"; id: A2aRpcIdentifier; result: unknown }
  | { jsonrpc: "2.0"; id: A2aRpcIdentifier; error: { code: number; message: string } };
```

```typescript
// extensions/a2a/src/http.ts:71-91 — response written after construction
function writeRpcResponse(
  response: ServerResponse,
  value: A2aRpcResponse | A2aRpcResponse[],
): void {
  const measured = boundedJsonUtf8Bytes(value, MAX_RESPONSE_BODY_BYTES);
  if (measured.complete) {
    writeJsonBody(response, 200, JSON.stringify(value));
    return;
  }
  // Error path still includes the original id in fallback
  const errorMessage = "A2A response exceeds the 1 MiB limit";
  const bounded = Array.isArray(value)
    ? value.map((entry) => createRpcError(entry.id, -32000, errorMessage))
    : createRpcError(value.id, -32000, errorMessage);
  // Request IDs can consume nearly the entire inbound budget...
  const fallback = boundedJsonUtf8Bytes(bounded, MAX_RESPONSE_BODY_BYTES).complete
    ? bounded
    : Array.isArray(bounded)
      ? bounded.map(() => createRpcError(null, -32000, errorMessage))
      : createRpcError(null, -32000, errorMessage);
  writeJsonResponse(response, 200, fallback);
}
```

The `id` from the request is echoed back in both success and error responses. A 10MB `id` string would cause the `boundedJsonUtf8Bytes` check to fail, but the error fallback still includes the original `id` in `createRpcError(entry.id, ...)`.

## Impact
- **Severity**: Low-Medium — memory pressure via large request ID
- **Affected**: A2A endpoint `/a2a/v1`
- **Attack vector**: POST with `"id": "x".repeat(10_000_000)`

## Fix
- Truncate or hash the `id` in error responses (don't echo full value)
- Apply size limit to `id` during request parsing (before constructing response object)

## Reproduction
1. POST `/a2a/v1` with `{"jsonrpc":"2.0","id":"x".repeat(10000000),"method":"SendMessage",...}`
2. Server attempts to serialize response with large ID, triggers error path
3. Error response still includes large ID in fallback construction

## References
- JSON-RPC 2.0 spec: id can be string, number, or null
- DoS via large identifiers
