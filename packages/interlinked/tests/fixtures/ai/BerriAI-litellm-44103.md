## TLDR

Problem this solves:

- Azure and Vertex requests can miss required beta headers
- Legacy thinking conversion drops `display: "updates"`

How it solves it:

- Add thinking-display beta header for Azure and Vertex chat requests
- Add tool-change beta header for Vertex Messages
- Keep display updates when converting enabled thinking to adaptive

## User Flow

Before:

1. Send POST http://localhost:4000/v1/chat/completions to an Azure or Vertex Claude deployment with `thinking.display: "updates"`
2. Provider throws 4xx or doesn't honor the thinking display mode.

After:

1. Send POST http://localhost:4000/v1/chat/completions to an Azure or Vertex Claude deployment with `thinking.display: "updates"`
2. Provider returns 2xx honoring the thinking display mode.

## Pre-Submission checklist

- [x] I have added meaningful tests
- [x] The affected test files pass locally, 345 tests
- [x] My PR passes all required CI/CD checks
- [x] My PR only addresses missing Anthropic feature betas and display preservation
- [x] I have received a Greptile Confidence Score of at least 4/5 before requesting review


## Screenshots / Proof of Fix

```json
{
  "max_tokens": 512,
  "tools": [
    {
      "name": "noop",
      "description": "An unrelated tool",
      "input_schema": {
        "type": "object",
        "properties": {}
      }
    },
    {
      "name": "mcp__test__ping",
      "description": "Return a ping. Call this when asked to ping.",
      "input_schema": {
        "type": "object",
        "properties": {}
      },
      "defer_loading": true
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": "Call mcp__test__ping now."
    },
    {
      "role": "system",
      "content": [
        {
          "type": "text",
          "text": "The ping tool is now available."
        },
        {
          "type": "tool_addition",
          "tool": {
            "type": "tool_reference",
            "name": "mcp__test__ping"
          }
        }
      ]
    }
  ],
  "model": "probe-bedrock-fable"
}
```

### Before

#### Bedrock

1. Send the request with `model: probe-bedrock-fable` and no beta header

```bash
curl -sS http://127.0.0.1:4019/v1/messages \
  -H "Authorization: Bearer $LITELLM_API_KEY" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  --data-binary @request.json -w "\nHTTP %{http_code}\n"
```

```text
{"type":"error","error":{"type":"invalid_request_error","message":"litellm.BadRequestError: BedrockException - {\"message\":\"messages.1.content.1: Input tag 'tool_addition' found using 'type' does not match any of the expected tags: 'connector_text', 'document', 'image', 'mid_conv_system', 'redacted_thinking', 'search_result', 'server_tool_use', 'text', 'thinking', 'tool_result', 'tool_search_tool_result', 'tool_use'\"}\n\nLiteLLM: model group 'probe-bedrock-fable' failed with the error above. No fallback was attempted."}}
HTTP 400
```

#### Anthropic

```bash
curl -sS http://127.0.0.1:4019/v1/messages \
  -H "Authorization: Bearer $LITELLM_API_KEY" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  --data-binary @request.json -w "\nHTTP %{http_code}\n"
```

```text
{"type":"error","error":{"type":"invalid_request_error","message":"litellm.BadRequestError: AnthropicException - {\"type\":\"error\",\"error\":{\"type\":\"invalid_request_error\",\"message\":\"messages.1.content.1: `tool_addition` blocks require anthropic-beta: inline-tools-2026-09-15\"},\"request_id\":\"req_011CfbqyH9zpxKRKpQJApJGo\"}\n\nLiteLLM: model group 'probe-anthropic-fable' failed with the error above. No fallback was attempted."}}
HTTP 400
```

### After

#### Bedrock

```bash
curl -sS http://127.0.0.1:4020/v1/messages \
  -H "Authorization: Bearer $LITELLM_API_KEY" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  --data-binary @request.json -w "\nHTTP %{http_code}\n"
```

```text
{"model":"probe-bedrock-fable","id":"msg_bdrk_on7qwkemjkpcccuwhnvinxe7h2bwoexcrlcnvt2ctztwsgrv3yla","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_bdrk_011x2bAaRN54FhAJq3B8LJRs","name":"mcp__test__ping","input":{}}],"container":null,"stop_reason":"tool_use","stop_sequence":null,"stop_details":null,"usage":{"input_tokens":562,"cache_creation_input_tokens":0,"cache_read_input_tokens":0,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":0},"output_tokens":31,"output_tokens_details":{"thinking_tokens":0},"service_tier":"standard"}}
HTTP 200
```

#### Anthropic

```bash
curl -sS http://127.0.0.1:4020/v1/messages \
  -H "Authorization: Bearer $LITELLM_API_KEY" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  --data-binary @request.json -w "\nHTTP %{http_code}\n"
```

```text
{"model":"probe-anthropic-fable","id":"msg_011CfbqyY6gCboDAkT5kB8th","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_011b8ip87jwkM6gvNAAicsoP","name":"mcp__test__ping","input":{},"caller":{"type":"direct"}}],"container":null,"stop_reason":"tool_use","stop_sequence":null,"stop_details":null,"usage":{"input_tokens":562,"cache_creation_input_tokens":0,"cache_read_input_tokens":0,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":0},"output_tokens":31,"output_tokens_details":{"thinking_tokens":0},"service_tier":"standard","inference_geo":"global"},"diagnostics":null}
HTTP 200
```

## Type

Bug Fix

## Caveats

None.



## Final Attestation

- [x] The tests check the right things, including the edge cases, and regressions in the respective real-world customer use-cases are not possible after this PR

<!-- devin-review-badge-begin -->

---

<a href="https://app.devin.ai/review/berriai/litellm/pull/44103" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://static.devin.ai/assets/gh-devin-review-dark.svg?v=4"><img src="https://static.devin.ai/assets/gh-devin-review-light.svg?v=4" alt="Devin Review"></picture></a>
<!-- devin-review-badge-end -->
