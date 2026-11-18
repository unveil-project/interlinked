

## Overview

Move the six allocator helpers into `CuMemAllocator` as private, overridable methods so subclasses can reuse its allocation lifecycle methods.

## Claims

- Make `_create_and_map`, `_unmap_and_release`, `_create_cpu_backup`, and `_release_cpu_backup` private static methods, with internal calls dispatched through `self`.
- Make `_get_pluggable_allocator` and `_use_memory_pool_with_allocator` private instance methods that use the existing retained callbacks.
- Update both poisoned-remapping test helpers to replace and restore the class static method correctly.

## Validation

The human submitter reviewed the initial migration and published [CUDA verification for head `47849d33b5`](https://github.com/vllm-project/vllm/pull/66518#issuecomment-6737469715), covering the allocator/sleep suites, HTTP sleep interfaces, subclass dispatch, and a baseline comparison. The report explicitly leaves ROCm, XPU, and downstream Ascend unverified. These device results are submitter-reported; the agent's Windows host has PyTorch 2.13.0+cpu and cannot reproduce them. Agent-side checks for the `_` prefix revision included an exact rename-only AST comparison, actual module/constructor/descriptor checks, applicable commit hooks, and mypy on both test files.

```bash
.venv/bin/python -m pytest tests/basic_correctness/memory/cumem/test_cumem.py -v
.venv/bin/python -m pytest tests/basic_correctness/memory/sleep_mode/test_sleep_mode.py -v
```

The subsequent review fix documents the subclassing contract and returns the pluggable allocator directly. Ruff, formatting, applicable commit hooks, source compilation, real module import/construction, and an AST comparison limited to the docstring and immediate-return simplification passed. Device tests were not rerun for this follow-up. The preceding head `47849d33b5` also has a [published device verification report](https://github.com/vllm-project/vllm/pull/66518#issuecomment-6737469715).

Agent-side checks:

- Ruff 0.17.2 lint/format, typos, and all ten applicable repository Python check hooks passed, including Buildkite test tethering.
- Module import, the real allocator constructor, compilation of all three changed files, and whitespace checks passed.
- An AST comparison against the base verified unchanged implementations for the four static operations and only callback lookup / helper dispatch changes elsewhere.
- Pinned mypy 1.20.2 passed both test files. The allocator reports three host-environment errors: Unix-only `mmap(flags=...)` / `MAP_PRIVATE`, and the existing nullable library-name annotation. Checking the original file with `--shadow-file` reproduced the same three errors.

The commit hooks ran with documented exclusions: mypy was checked separately as above; the filename check was performed natively because Bash cannot run in this Windows environment; the Docker graph hook is inapplicable to these files; informational/signoff Bash hooks were omitted, and the commit's `Signed-off-by` was verified directly. Hooks for unchanged file types were also excluded to avoid installing unrelated tool environments. This is not a claim that an unmodified full pre-commit run passed.

Local pytest collection failed in `tests/conftest.py` on missing `uvloop`; no device or model evaluation was run by the agent. The existing Basic Correctness CuMem and Sleep Mode CI steps, including AMD mirrors, already select both suites and include the changed paths in their source dependencies.

## Details

Module-level calls bypass subclass methods of the same name. Dispatching through `self` provides the requested extension points for users such as vllm-ascend's `CaMemAllocator`. Pool creation already consumes instance callbacks, so those redundant parameters are removed.

The module-level helper exports are removed. The six underscored helpers are documented subclass extension hooks, not direct public entry points. The class docstring lists all six and explicitly treats changes to their names or signatures as breaking changes. XPU's independent helpers, direct CUDA memcpy calls, synchronization, backup ownership, ROCm-specific handles, singleton behavior, and sleep/wake policies are unchanged. Complete Ascend lifecycle reuse remains follow-up work.

Duplicate-work checks found no open PR for this migration after searches for `CuMemAllocator staticmethod`, `cumem inheritance`, `use_memory_pool_with_allocator`, and the broader cuMem area. Merged #64630 introduced the backup implementation; open #64465 fixes wake-up copy retry and #65772 fixes asleep-allocation backup release. Neither migrates these helpers. No issue is claimed as fixed.

AI assistance was used for implementation, test updates, host validation, and this description. The submitting human confirmed line-by-line review and relevant device test execution for the initial migration; follow-up validation is scoped above.

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

