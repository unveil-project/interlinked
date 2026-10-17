## Problem

ZeroClaw's OpenRouter provider (`src/providers/openrouter.rs`) builds a `NativeChatRequest` struct with only standard OpenAI-compatible fields (`model`, `messages`, `temperature`, `max_tokens`, `tools`, `tool_choice`). It has no `provider` field and no `extra_body` mechanism, so OpenRouter's [provider routing parameters](https://openrouter.ai/docs/provider-routing) cannot be set natively.

OpenRouter supports a `provider` object in the request body to control which infrastructure provider serves the request:

```json
{
  "provider": {
    "only": ["arcee-ai"],
    "ignore": [],
    "order": [],
    "sort": "price"
  }
}
```

This matters for cost control — different providers serving the same model weights can have different pricing. Without this, ZeroClaw users have no way to pin requests to specific providers or sort by cost, and must accept OpenRouter's default routing.

## Competing Frameworks

- **OpenClaw** uses `"params": {"provider": {"only": [...]}}` in model config
- **Hermes Agent** uses `provider_routing: {only: [...]}` in `config.yaml`

## Proposed Change

1. **Extend `NativeChatRequest`** in `src/providers/openrouter.rs` with an optional `provider` field:

```rust
#[derive(Debug, Serialize)]
struct ProviderRouting {
    #[serde(skip_serializing_if = "Vec::is_empty")]
    only: Vec<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    ignore: Vec<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    order: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    sort: Option<String>,
}

#[derive(Debug, Serialize)]
struct NativeChatRequest {
    // ... existing fields ...
    #[serde(skip_serializing_if = "Option::is_none")]
    provider: Option<ProviderRouting>,
}
```

2. **Add config keys** to `ModelProviderConfig` in `src/config/schema.rs`:
   - `provider_only: Option<Vec<String>>`
   - `provider_ignore: Option<Vec<String>>`
   - `provider_order: Option<Vec<String>>`
   - `provider_sort: Option<String>`

3. **Wire config → request**: When any routing option is set on the model's `ModelProviderConfig`, populate the `provider` field on `NativeChatRequest`.

4. **Example config** (wherever ZeroClaw documents its config.toml schema):

```toml
[[models]]
name = "trinity-large-thinking"
provider = "openrouter"
provider_only = ["arcee-ai"]
provider_sort = "price"
```

## Reference

- OpenRouter Provider Routing docs: https://openrouter.ai/docs/provider-routing

## Scope

~30-50 lines of Rust. The change is localized to `openrouter.rs` (request struct + serialization) and `schema.rs` (config struct). No changes to other providers.

I'm working on a PR for this.
