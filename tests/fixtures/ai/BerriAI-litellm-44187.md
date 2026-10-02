
## TLDR

Problem this solves:

- An unpriced model's span says cost 0, so Langfuse shows $0
- Arize and Langfuse can't tell a free call from an unpriced one

How it solves it:

- Skip the span cost when the price lookup failed
- Free models and cache hits still send 0
- Same rule for the OTel v2 span data

Intentional product change: spans for calls LiteLLM could not price no longer carry `llm.cost.total = 0` (or `litellm.cost.total` / `langfuse.observation.cost_details` on OTel v2), so the backend prices them itself or shows no cost.

## User Flow

Before: a developer calling a model missing from the price map sees every call as free in Langfuse.

1. They set `litellm.callbacks = ["langfuse_otel"]` and call `litellm.completion(model="openai/unpriced-model", ...)` against their OpenAI-compatible server
2. The call returns a completion with 10 prompt and 20 completion tokens
3. The span carries `llm.cost.total: 0.0`, so Langfuse records the generation at $0 and never applies its own model price

After: the same call arrives without a cost, so Langfuse can price it from its own model definition.

1. They set `litellm.callbacks = ["langfuse_otel"]` and call `litellm.completion(model="openai/unpriced-model", ...)` against their OpenAI-compatible server
2. The call returns a completion with 10 prompt and 20 completion tokens
3. The span carries no `llm.cost.total`, so Langfuse prices the generation from its model definition, or shows no cost when it has none

## Relevant issues

Closes #44186

Related: #36561. Through the proxy the Router registers an empty price entry for an unpriced deployment, so the lookup does not fail and this change has no effect there until #36561 is fixed too.

## Pre-Submission checklist

**Please complete all items before asking a LiteLLM maintainer to review your PR**

- [x] I have added meaningful tests
- [x] The handful of test files covering my change pass locally, e.g. `uv run pytest tests/unit/<your_test_file>.py -v`. Leave the suites (`make test-unit-*`, `make test-unit`) to CI: it finishes in ~15 minutes where a laptop takes an hour or more
- [ ] My PR passes all required CI/CD checks (e.g., lint, schema.d.ts sync check, etc.)
- [x] My PR's scope is as isolated as possible; it only solves 1 specific problem
- [ ] I have received a Greptile **Confidence Score of at least 4/5** before requesting a maintainer review (Greptile reviews automatically once the PR is opened; only comment `@greptileai` to re-request a review after pushing changes)

## Delays in PR merge?

If you're seeing a delay in your PR being merged, ping the LiteLLM Team on [Slack (#pr-review)](https://join.slack.com/t/litellmossslack/shared_invite/zt-3o7nkuyfr-p_kbNJj8taRfXGgQI1~YyA).

## Screenshots / Proof of Fix

Setup: a local OpenAI-compatible stub on 127.0.0.1:64071 answers every chat completion with 10 prompt and 20 completion tokens, so no provider is called. The cost path only reads the model name and the usage block, so a real provider gives the same result. `unpriced-model` is not in the price map, `gpt-4o-mini` is the priced control.

```bash
OTEL_EXPORTER=console LITELLM_LOCAL_MODEL_COST_MAP=True python - <<'EOF' 2>&1 | grep -E '"llm.model_name"|"llm.cost.total"|"llm.response.cost"'
import time
import litellm
litellm.callbacks = ["langfuse_otel"]
for m in ["gpt-4o-mini", "unpriced-model"]:
    litellm.completion(model=f"openai/{m}", api_base="http://127.0.0.1:64071/v1", api_key="sk-fake", messages=[{"role": "user", "content": "hi"}])
time.sleep(7)
EOF
```

### Before (615ed7900f)

1. Run the command above
2. The unpriced call is exported with a zero cost:

```
        "llm.model_name": "gpt-4o-mini",
        "llm.cost.total": 1.35e-05,
        "llm.response.cost": 1.35e-05,
        "llm.model_name": "unpriced-model",
        "llm.cost.total": 0.0,
        "llm.response.cost": 0.0,
```

### After (7c8673f8cc)

1. Run the command above
2. The unpriced call is exported without a cost, the priced call is unchanged:

```
        "llm.model_name": "gpt-4o-mini",
        "llm.cost.total": 1.35e-05,
        "llm.response.cost": 1.35e-05,
        "llm.model_name": "unpriced-model",
```

Unit tests: `test_arize_cost_attrs_tell_unpriced_call_from_free_call` in `tests/unit/integrations/arize/test_arize_utils.py` and `test_llm_call_span_tells_unpriced_call_from_free_call` in `tests/unit/integrations/otel/test_otel_v2_emitter.py` cover a free model, an unpriced model and an unpriced cache hit. The unpriced case fails on main and passes here; the other two pass on both.

## Type

🐛 Bug Fix

## Caveats (if any)

### Medium

- Through the proxy the Router registers an empty price entry first
  - So the lookup "succeeds" at 0 and the span still says 0
  - Fixed only together with #36561, checked locally with both applied

### Low

- An unpriced call with a guardrail cost now sends no cost
  - Before it sent the guardrail cost alone, which was not the call's total either
- Failed calls still send cost 0, unchanged
- Not checked against a live Langfuse: with no ingested cost it should price from its model definition
  - If not, Langfuse shows no cost instead of $0, which is at least not a wrong number

## Final Attestation

- [ ] The tests check the right things, including the edge cases, and regressions in the respective real-world customer use-cases are not possible after this PR
