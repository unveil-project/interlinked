

## Overview

Fixes #59608. When reasoning ends on a tool-call opener instead of `</think>` (GLM-4.7/5.x can jump straight from reasoning into `<tool_call>`), the structured-output gate started the grammar constraint one token past the opener. The grammar never saw the opener, so it forced the model to emit a second `<tool_call>`, the parser then dropped the malformed call, and `required`/named tool calls came back empty.

## Claims

- The reasoning-end fast path now distinguishes terminators that are pure reasoning syntax (`</think>`) from terminators that are the first content token (a tool-call opener), using the transition events already declared in each parser config.
- For content terminators the constraint starts at the marker and the marker is fed to the grammar, so the grammar state advances past the opener instead of re-forcing it. Pure terminators keep the existing `offset + 1` behavior.
- Configs affected on main: `glm47_moe` (the `glm45`/`glm47` reasoning parsers), `qwen3`, `gemma4`, `mistral`. Each has a `(REASONING, tool opener)` transition that emits both `REASONING_END` and `TOOL_CALL_START` on a single-token terminal.

## Validation

New unit coverage, all runnable on CPU:

- `tests/parser/engine/test_glm47_moe.py`: the GLM config derives `reasoning_end_token_ids == {</think>, <tool_call>}` and `reasoning_end_content_token_ids == {<tool_call>}`.
- `tests/parser/engine/test_deepseek_v4.py`: the multi-token DSML opener stays out of both sets (negative case).
- `tests/v1/structured_output/test_structured_output_manager.py`: manager-level flows with real xgrammar/guidance/outlines grammars. Under a `z[0-9]+` regex with `z` as a content terminator, the marker row is constrained (`UCCC`, was `UUCC`), the grammar consumes the marker on accept, and afterwards a digit validates while a duplicate marker is rejected. A companion case locks the pure-marker path through the same fast-path branch (`UUCCC`, unchanged).

Commands and results:

```
.venv/bin/python -m pytest tests/parser/engine/test_glm47_moe.py tests/parser/engine/test_deepseek_v4.py -q
# 119 passed
.venv/bin/python -m pytest tests/v1/structured_output/test_structured_output_manager.py -q
# 49 passed, 1 xfailed (pre-existing guidance xfail)
.venv/bin/python -m pytest tests/v1/spec_decode/test_mtp_structured_output.py tests/v1/structured_output/ -q
# 179 passed, 1 xfailed
.venv/bin/python -m pytest tests/parser/ -q --ignore=tests/parser/cohere
# 5716 passed (cohere subdir needs the optional cohere_melody package, unrelated)
```

Red proof: with `vllm/` stashed, the new content-marker flow fails on all three backends (xgrammar/guidance/outlines) and the new derivation tests fail; the pure-marker guard passes both before and after.

I have no GPU on this machine, so I could not rerun the GLM-5.3 serving eval from the issue; the failing mechanism (constraint boundary skipping the opener) is reproduced and fixed at the manager flow level above.

## Details

Root cause: `_derive_reasoning_end_token_ids` collects every token that can end reasoning, and `_get_constraint_start` assumed any such terminator is pure reasoning syntax, placing the boundary after it (`offset + 1`). That assumption is wrong whenever the terminator doubles as the tool-call opener: the `glm_4_7` xgrammar structural tag wraps calls as `<tool_call>name<arg_key>...</tool_call>`, so the opener is the first grammar-constrained token. Skipping it left the grammar at its root expecting `<tool_call>`, which is exactly the duplicated opener the issue shows.

The parser engine now also exposes `reasoning_end_content_token_ids`: the subset of reasoning-end tokens whose transition out of `REASONING` also emits `TOOL_CALL_START`. The structured-output manager constrains from the marker for that subset and keeps `offset + 1` otherwise. This lives in the shared derivation (`engine/parser_engine.py`) rather than a model file because the misclassification is in the shared code, not in any one parser's config (per `vllm/parser/AGENTS.md`).

Duplicate check: #59608 has no linked PR and no comments. #36138 covers a different failure (draft tokens after the reasoning end not validated under speculative decoding) and predates the manager rewrite. #56403 constrains non-strict GLM tool calls via an EBNF grammar, a different path.

AI assistance was used (Kimi Code). I reviewed every changed line and ran the tests listed above.

---

<details>
<summary> Pull Request Checklist </summary>

- [x] I used vLLM's `/pr-checklist` skill. (Mandatory for agents, optional for humans).
- [x] AI assistance was used during the creation of this PR.

- [x] **Design Fit:** Minimizes impact on core components, reuses existing functionality, and justifies added complexity.
- [x] **Testing and Validation:** Validates the change and ensures any added tests are meaningful and reliable, with CI coverage or documented CI resource constraints and validation performed outside CI.
- [x] **Code Quality and Style:** Keeps code and comments clear and concise, and updates relevant documentation and examples.
- [x] **Pull Request Contents:** Includes a brief summary and relevant links, supports claims with evidence, explains root causes and implementation trade-offs, and follows the contributing guide.
</details>

