## Fixes
Fixes #43990

## What
`/responses` and `/v1/responses` used a hardcoded 30s wait for the first `response.create` when `?model=` was omitted. Clients that pre-open idle WebSocket pools (e.g. OpenAI Codex guardian) got closed with `1008 Timed out waiting for first message` before sending anything.

This reads `general_settings.responses_websocket_first_message_timeout` (seconds). Default stays 30 when unset so existing deployments are unchanged. Raise it for long-lived prep pools.

## Test
- `test_first_frame_timeout_closes_socket`
- `test_late_first_frame_accepted_when_timeout_raised`
- `test_resolve_first_message_timeout_from_general_settings`

Thanks for the thorough repro in the issue.
