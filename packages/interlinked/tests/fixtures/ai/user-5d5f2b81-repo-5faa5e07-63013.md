## Overview

Revert #62624 (`2a1a3c56c955e2719f0855b61c7ade5474980486`) while the API placement concerns remain unresolved. The PR merged with an open review thread questioning whether routing-row restoration belongs in `Platform`.

## Claims

- Remove `Platform.get_routed_experts_local_rows` and restore the previous generic DP/TP capture path.
- Revert the hook documentation and its tests. All four affected files are byte-for-byte identical to their versions immediately before #62624; no additional implementation changes are included.

## Validation

Checks were run locally using the existing Python environment through `uv`:

- **PASS:** Ruff 0.14.0 check and format, typos, and markdownlint-cli2 hooks on the changed files.
- **PASS:** SPDX, lazy-import, forbidden-import, torch-CUDA-call, config, boolean-context-manager and test-tethering checks.
- **PASS:** `git diff origin/main --check`, Python syntax checks, and Git blob-ID comparison of all four files against `2a1a3c56c9^`.
- **BLOCKED during collection:** `python -X utf8 -m pytest --import-mode=importlib -p no:cacheprovider -q --confcutdir=tests/model_executor tests/model_executor/test_routed_experts_capture.py`. This Windows environment cannot import `uvloop`; no tests passed in this attempt.
- Full pre-commit could not complete because hook environment initialization failed. The checks listed above ran individually; mypy was not run. The bash sign-off hook could not start on Windows; the commit includes `Signed-off-by` via `git commit --signoff`.
- No model evaluation, accelerator/graph validation, or H20 testing was performed for this revert.

## Details

[bnellnm's concern](https://github.com/vllm-project/vllm/pull/62624#discussion_r4329574869) and [wangxiyuan's follow-up](https://github.com/vllm-project/vllm/pull/62624#discussion_r4341227361) question the scope of the Platform hook. Their thread remains unresolved. This rollback leaves the choice of replacement design for #61539 to further discussion; it does not implement #62441.

Downstream platforms relying on the new hook will lose that extension point until an agreed replacement lands.

**Duplicate-work check:** reviewed #61539 and searched open PRs for `62624 in:body`, `revert routed experts`, and this head branch. No existing PR reverting #62624 was found.

AI assistance was used to prepare, inspect, validate and submit this revert.

---

<details>
<summary> Pull Request Checklist </summary>

- [x] I used vLLM's `/pr-checklist` skill. (Mandatory for agents, optional for humans).
- [x] AI assistance was used during the creation of this PR.

- [x] **Design Fit:** Complete revert to the previous behavior; no replacement API introduced.
- [ ] **Testing and Validation:** Static and integrity checks pass; regression collection and full pre-commit remain blocked as documented above.
- [x] **Code Quality and Style:** Applicable formatting and documented local checks pass; documentation is reverted with the API.
- [x] **Pull Request Contents:** Includes motivation, review links, duplicate-work checks, validation limits and AI assistance disclosure.
</details>
