Fixes #3878

`merge_adapter` / `unmerge_adapter` on bnb 4-bit LoRA layers dequantize, add/subtract the LoRA delta, then re-quantize into a **new** `Params4bit`. That permanently drifts the base weight across cycles and leaves callers holding a stale parameter object.

This PR stashes the pre-merge `Params4bit` on merge and restores that same object on unmerge. The old re-quant path stays as a fallback when no stash exists.

Focused CPU unit tests cover exact object restore, multi-cycle drift, multi-adapter stack order, and the lossy fallback.