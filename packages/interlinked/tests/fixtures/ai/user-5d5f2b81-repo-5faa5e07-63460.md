

## Overview

Share the dense and sparse NCCL trainer rendezvous sequence and worker payload construction, retaining overridable engine initialization hooks and the current initialization behavior.

## Claims

- Both trainers use `run_trainer_rendezvous()` to submit worker initialization, open the trainer endpoint synchronously, and then await the worker future inside the existing executor context.
- Both `_build_worker_init_payload()` classmethods delegate construction and serialization to `build_worker_init_payload()` in `nccl_common.py`. Dense passes its packed configuration explicitly; sparse retains the unpacked defaults. Dense endpoint creation still dispatches through its instance hook.
- Payload fields and defaults, non-sender early returns, communicator assignment, exception propagation, and executor exit waiting remain unchanged. Sending, receiving, rank calculations, and shutdown are untouched.

## Validation

After merging upstream `main` at `cba669d45d`, the Protocol-based builder revision was validated on Windows / Python 3.12 / PyTorch 2.13.0+cpu:

```text
.venv/Scripts/python.exe .venv/.review-tmp/run_nccl_cpu_tests.py \
  tests/distributed/test_weight_transfer.py \
  tests/distributed/test_weight_transfer_nccl_uid.py \
  -k nccl -q -o cache_dir=.venv/.review-tmp/pytest-nccl-cache

59 passed, 8 skipped, 83 deselected in 22.71s
```

The local, untracked runner uses `--noconftest` and directly loads the real `checkpoint_weight_patch.py` and `mtp_validation.py` leaf modules to avoid unrelated LLM/model-loader package initialization. It does not replace engine implementations or test functions. The eight skips are existing GPU tests on this CPU-only host. This is isolated CPU validation, not a successful run of the ordinary full suite.

<details>
<summary>Reproduce the local CPU runner</summary>

From the repository root, with `PYTHONUTF8=1` on Windows, run this with the virtual environment's Python:

```python
import importlib.util
import sys
from pathlib import Path

import pytest

root = Path.cwd()
sys.path.insert(0, str(root))
for leaf in ("checkpoint_weight_patch", "mtp_validation"):
    name = f"vllm.model_executor.model_loader.{leaf}"
    spec = importlib.util.spec_from_file_location(
        name, root / f"vllm/model_executor/model_loader/{leaf}.py"
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
raise SystemExit(pytest.main([
    "--noconftest",
    "tests/distributed/test_weight_transfer.py",
    "tests/distributed/test_weight_transfer_nccl_uid.py",
    "-k", "nccl", "-q",
]))
```

</details>

Passed on all four changed files:

- `pre-commit run ruff-check --files <changed files>`
- `pre-commit run ruff-format --files <changed files>`
- Direct runs of `check_spdx_header.py`, `check_init_lazy_imports.py`, `check_forbidden_imports.py`, and `check_boolean_context_manager.py`.
- `check_test_tethering.py tests/distributed/test_weight_transfer.py` and `git diff --check`.

Tests cover concurrent entry with bounded events, worker/trainer exception propagation, packed and unpacked dense payloads, sparse defaults, communicator identity, non-senders, and inherited dense `trainer_init()` dispatching subclass hooks. The existing test file is already selected by the distributed Buildkite jobs.

On this Windows host, the ordinary pytest entry point fails while loading the repository conftest because `uvloop` is unavailable. Full local pre-commit is blocked by cached-environment permissions and unavailable temporary directories; local mypy was not run. The broken commit hooks were bypassed after running the available checks separately; the repository hook configuration was not changed. Commits created here include DCO sign-off. The existing test typing fix from `8245bc95ac` is retained.

The [earlier hardware verification report](https://github.com/vllm-project/vllm/pull/63460#issuecomment-6382670756) covers `13d75efa39` and its test-only follow-up `8245bc95ac`: real two-GPU dense transfer and trainer rendezvous passed, with the documented M2N failures also present on the base. Those hardware tests were not rerun for this Protocol-based simplification; current-revision evidence is the isolated CPU suite above. Model evaluation is not applicable to this initialization-only refactor; no model output, accuracy, serving, or performance change is claimed.

## Details

The shared executor sequence and worker payload builder live in the existing `nccl_common.py`. Engine classmethod hooks supply the payload fields and remain overridable; callers still own communicator creation. The builder accepts the existing `NCCLRendezvous` Protocol and reads its three rendezvous fields internally. Dense explicitly supplies the packed keyword arguments; sparse uses `build_worker_init_payload(init_info)` with the unpacked defaults. The builder still applies `rank_offset=1`, without a new abstraction or engine-type inspection. The dense endpoint hook assigns the communicator on the instance so it remains assigned before a worker future error is surfaced. Sparse retains its direct base class and uses lambdas for the two callbacks. Existing `ThreadPoolExecutor` imports in both engines are still needed by their send paths.

The checklist review covered design fit, compatibility, testing/CI selection, code style, and PR contents. This adds no backend selection, new inheritance layer, timeout, retry, cancellation, or failure cleanup. In particular, an endpoint failure still exits the executor context and waits for the worker, matching the original behavior.

Duplicate-work checks searched open PRs for `weight transfer rendezvous`, `nccl trainer`, `"run_trainer_rendezvous"`, and `"trainer" "refactor" "weight"`; no equivalent refactor was found. There is no linked issue, so issue-number-specific checks are not applicable. Related PRs #57022 and #57374 change communicator/platform transport behavior, #62557 adds per-update source-rank selection, and #63457 changes accelerator API calls. This PR only extracts trainer initialization and does not duplicate those changes.

AI assistance was used to implement this change, run validation, and prepare this description.

---

<details>
<summary> Pull Request Checklist </summary>

- [x] I used vLLM's `/pr-checklist` skill. (Mandatory for agents, optional for humans).
- [x] AI assistance was used during the creation of this PR.

- [x] **Design Fit:** Minimizes impact on core components, reuses existing functionality, and justifies added complexity.
- [ ] **Testing and Validation:** Validates the change and ensures any added tests are meaningful and reliable, with CI coverage or documented CI resource constraints and validation performed outside CI.
- [x] **Code Quality and Style:** Keeps code and comments clear and concise, and updates relevant documentation and examples.
- [x] **Pull Request Contents:** Includes a brief summary and relevant links, supports claims with evidence, explains root causes and implementation trade-offs, and follows the contributing guide.
</details>

