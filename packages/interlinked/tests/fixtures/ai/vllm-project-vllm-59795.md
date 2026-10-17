Fixes #59784. Thank you @Kirire for the thorough report and for testing the workaround!

## Bug

Serving `Qwen/Qwen3-VL-Reranker-8B` with `--runner pooling` and the sequence-classification override (`Qwen3VLForSequenceClassification`) crashed during weight loading:

```
File "vllm/model_executor/models/adapters.py", in load_weights_using_from_2_way_softmax
    if text_config.tie_word_embeddings:
AttributeError: 'Qwen3VLTextConfig' object has no attribute 'tie_word_embeddings'
```

## Root cause

transformers' `Qwen3VLConfig` declares `tie_word_embeddings=False`, but its `Qwen3VLTextConfig` does not expose the attribute at all (verified with transformers 5.18.0: `getattr(text_config, "tie_word_embeddings", "MISSING")` returns `"MISSING"`). Both sequence-classification loaders in `adapters.py` (`load_weights_using_from_2_way_softmax` and `load_weights_no_post_processing`) accessed the attribute directly.

## Fix

Defensive lookup with `False` as the default at both access sites:

```python
if getattr(text_config, "tie_word_embeddings", False):
```

The default matches the parent config's declared value, and behavior is unchanged for every config that defines the attribute. This mirrors the workaround the reporter tested end-to-end (model starts and exposes `/v1/rerank`, `/v2/rerank`).

## Tests

New regression tests in `tests/test_adapters.py` (6 tests, all passing):

```bash
python -m pytest tests/test_adapters.py -v
# 6 passed
```

- `test_missing_tie_word_embeddings_falls_back_to_false` (both loaders): a text config without the attribute no longer raises `AttributeError`; the tied-weights path is skipped. I confirmed these two tests fail with the exact reported `AttributeError` before the fix.
- `test_tie_word_embeddings_present_behaves_as_before` (both loaders x True/False): configs that define the attribute keep their exact behavior — `tie_weights` is invoked if and only if the attribute is truthy.

Model evaluation: this change does not alter model outputs or accuracy — it only unblocks weight loading for configs that previously crashed outright. End-to-end serving validation of the identical workaround was performed by the reporter (see the issue).

## Notes per repo contribution policy

- Not duplicating an existing PR: I checked the issue timeline (no cross-referenced PRs) and searched open PRs mentioning `tie_word_embeddings` (only unrelated ones: #30412, #50077, #41365). No open PR addresses this fix.
- AI assistance was used to implement this change.
