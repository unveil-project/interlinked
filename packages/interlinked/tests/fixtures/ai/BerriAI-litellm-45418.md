## Summary

When Mistral returns `message.content` as a **list of chunks** (which happens when the model cites a source: the citation becomes a `{"type": "reference", "reference_ids": [...]}` chunk between two `text` chunks), LiteLLM only keeps the **last** `text` chunk.

Root cause: `MistralConfig._handle_content_list_to_str_conversion` (`litellm/llms/mistral/chat/transformation.py`) **assigns** instead of appending:

```python
elif block.get("type") == "text":
    text_content = block.get("text", "")  # overwrites previous text chunks
```

and `reference` chunks are skipped entirely, so `[text, reference, text]` collapses to just the final text chunk.

## Change

Append each `text` chunk:

```python
elif block.get("type") == "text":
    text_content += block.get("text", "")
```

## Verification

New tests in `tests/unit/llms/mistral/test_mistral_chat_transformation.py`:
- `[text, reference, text]` now yields the concatenated full answer (this test failed before the fix with `'Second part.' != 'First part. Second part.'`);
- thinking + text mapping to `reasoning_content`/`content` still works.

File suite: 36 passed; the single failing `test_mistral_chat_transformation` test also fails on `upstream/main` without this change (pre-existing).

Fixes #45378