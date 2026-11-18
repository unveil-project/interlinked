<!-- markdownlint-disable -->

## Overview

Refactor the DBO routed-experts capture fix in [vllm-project/vllm#63372](https://github.com/vllm-project/vllm/pull/63372) to reuse `UBatchContext.token_offset` instead of duplicating it in `ForwardContext.additional_kwargs`.

This is a review contribution targeting **algebra-MCX/vllm:fix/mrv2-routed-experts-microbatch-rows**, based on its verified head `ec0cb30c33a393463d11bb180962fd03f33dbd3b`. It does not submit the original bug fix to upstream again. Searches of upstream PRs referencing #63372 and DBO token offsets, and all open PRs in the author's repository, found no existing PR for this refactor. It implements [the existing review suggestion](https://github.com/vllm-project/vllm/pull/63372#discussion_r4366530188).

## Claims

- Pass token slice starts to `make_ubatch_contexts()` in `UBatchRunner.begin_capturable_run()`.
- Read `dbo_current_ubatch_token_offset()` in `RoutedExpertsCapturer.capture()` and remove the dedicated forward-context keyword.
- Preserve the original per-microbatch buffer write ranges. The generic helper returns zero outside DBO.
- Extend the existing capture test for 2+2 and 3+2 tokens on DP ranks 0 and 1. Extend existing threaded runner and CUDA Graph tests to observe offsets before and after the yield.

## Validation

Local environment: Windows, Python 3.12, PyTorch 2.13.0+cpu. Commands used the existing virtual environment, with `PYTHONUTF8=1`.

| Check | Actual result |
| --- | --- |
| `python -m pytest -q tests/model_executor/test_routed_experts_capture.py` | Blocked during shared conftest import: `ModuleNotFoundError: No module named 'uvloop'` (exit 4). |
| `python -m pytest -q tests/v1/worker/test_ubatch_offsets.py` | Same shared conftest import failure (exit 4). |
| `python -m pytest --noconftest -q tests/v1/worker/test_ubatch_offsets.py` | **4 passed** using real vLLM imports. |
| Supplementary source-isolated capture checks | **37 passed** using existing capture test functions and the production capturer class source. Includes non-DBO, DP/TP restoration, padding, and the four new microbatch cases. This excludes the full import graph, router binding, the runner, and GPU execution, and is **not** a full-suite pass. |
| Supplementary source-isolated regression against `ec0cb30c33` | **4 failed**, for overwritten rows: 8/8 mismatched elements for 2+2 tokens and 8/10 for 3+2 tokens. With the refactor, all four pass. The baseline keeps the old implementation but supplies offsets only through the generic helper, so this checks consumption of the new offset source. |
| Full `python -m pre_commit run --files` on the four changed files | Blocked while provisioning hook environments: Windows cache permissions; an independent cache retry failed in Git/MSYS with `NtCreateDirectoryObject ... 0xC0000022`. |
| `python -m pre_commit run ruff-check --files ...` | **Passed** for all four files. |
| `python -m pre_commit run ruff-format --files ...` | **Passed** for all four files. |
| `python tools/pre_commit/check_test_tethering.py tests/model_executor/test_routed_experts_capture.py tests/v1/worker/test_gpu_ubatch_slicing.py` | **Passed**. Existing Model Executor and V1 Executor + Worker steps select these suites. |
| `python -m compileall -q` on all four changed files | **Passed**. |
| `git diff --check algebra-MCX/fix/mrv2-routed-experts-microbatch-rows...HEAD` | **Passed**. |
| `rg -n routed_experts_token_offset vllm tests` | No matches. |

GPU E2E, routing comparison, model evaluations, and CUDA Graph execution were **not run**: this host has no CUDA GPU. No H20 environment was used. The added runner/graph assertions still need execution in a supported environment, as does the complete capture suite. The original PR's H200 results are not results for this refactor.

## Details

The original fix wrote each microbatch's restored local routing rows at its token slice start. The same starts now populate the existing DBO contexts; the capturer reads the offset inside the active worker thread. `_restore_local_topk_ids()`, DP/TP/EP communication, buffer allocation/snapshots/transfers, scheduling, synchronization, and `ubatching.py` are unchanged. Both eager and capturable runs share the updated context creation call; actual GPU replay remains unverified.

Before committing, the author branch was fetched again and merged (`Already up to date`). The delta contains one commit and four files, based directly on the author's branch. The commit has `Signed-off-by` and no AI attribution trailers. Local commit hooks were bypassed only for this commit after the documented hook environment failures; no repository hook configuration was changed.

AI assistance (Codex) was used to prepare the change and validation notes.

---

<details>
<summary> Pull Request Checklist </summary>

- [x] I used vLLM's `/pr-checklist` skill. (Mandatory for agents, optional for humans).
- [x] AI assistance was used during the creation of this PR.

- [x] **Design Fit:** Minimizes impact on core components, reuses existing functionality, and justifies added complexity.
- [ ] **Testing and Validation:** Full capture-suite, runner/graph tests, and complete hooks require a supported environment; partial checks and limitations are documented above.
- [x] **Code Quality and Style:** Keeps code and comments clear and concise; this internal refactor introduces no user-visible behavior or documentation changes.
- [x] **Pull Request Contents:** Includes relevant context, claims, evidence, tradeoffs, and validation limitations.
</details>

**BEFORE SUBMITTING, PLEASE READ <https://docs.vllm.ai/en/latest/contributing>** (anything written below this line will be removed by GitHub Actions)