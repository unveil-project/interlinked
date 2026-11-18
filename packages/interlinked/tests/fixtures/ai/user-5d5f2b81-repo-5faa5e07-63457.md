

## Overview

Use the unified PyTorch accelerator APIs for backend-independent operations in `vllm/distributed/weight_transfer`, following #30679 and existing vLLM usage.

## Claims

- Replace availability checks, device selection, synchronization, and current-stream lookups that do not pass streams to CUDA-specific communication APIs.
- Use `torch.Event` for sharded-RDT slot and quantization dependencies.
- Preserve stream-level synchronization boundaries, NCCL stream interfaces, and CUDA IPC behavior.

## Validation

Passed on Windows with PyTorch 2.13.0+cpu:

- `pre-commit run ruff-check --files <six changed files>`
- `pre-commit run ruff-format --files <six changed files>`
- Direct runs of `tools/pre_commit/check_torch_cuda.py`, `check_spdx_header.py`, `check_init_lazy_imports.py`, and `check_forbidden_imports.py` on the changed files.
- Python AST syntax checks and `git diff --check`.

Attempted with `PYTHONUTF8=1`:

```text
uv run --no-sync -- .venv/Scripts/python.exe -m pytest \
  tests/distributed/test_packed_tensor.py \
  tests/distributed/test_sharded_rdt_plan.py \
  tests/distributed/test_sharded_rdt_trainer.py \
  tests/distributed/test_sharded_rdt_producer.py -q
```

Pytest fails while loading the repository conftest because `uvloop` is unavailable in this Windows environment; no tests reached execution. Full pre-commit is blocked by cache permissions and a Git Bash `NtCreateDirectoryObject` failure with a fresh writable cache. The mypy hook could not initialize. Commits include DCO sign-off; the broken commit hooks were bypassed after running the available checks separately.

No GPU transfer test or model evaluation was performed on this CPU-only host. Human line-by-line review and hardware validation remain pending, so this PR is a draft. No output-quality, performance, or new-backend support claim is made.

## Details

### Evidence of existing unified API use in vLLM

These links point to upstream commit `7a64fb8fc9239cb65e0df9313fa759594dfb206a`:

| API / pattern | Existing upstream use |
| --- | --- |
| Availability check followed by device synchronization | [WorkerBase.synchronize_device](https://github.com/vllm-project/vllm/blob/7a64fb8fc9239cb65e0df9313fa759594dfb206a/vllm/v1/worker/worker_base.py#L129-L133) uses `torch.accelerator.is_available()` and `torch.accelerator.synchronize()`. |
| Current-stream synchronization | [EPLB communicator](https://github.com/vllm-project/vllm/blob/7a64fb8fc9239cb65e0df9313fa759594dfb206a/vllm/distributed/eplb/eplb_communicator.py#L227-L232) already uses `torch.accelerator.current_stream().synchronize()`. |
| Device selection in a background thread | [EPLB async worker](https://github.com/vllm-project/vllm/blob/7a64fb8fc9239cb65e0df9313fa759594dfb206a/vllm/distributed/eplb/async_worker.py#L31-L34) uses `torch.accelerator.set_device_index(device_index)`. |
| Device-index context manager | [PyNcclCommunicator initialization](https://github.com/vllm-project/vllm/blob/7a64fb8fc9239cb65e0df9313fa759594dfb206a/vllm/distributed/device_communicators/pynccl.py#L175-L182) uses `torch.accelerator.device_index(device.index)`. |
| Generic events for cross-thread dependencies | [EPLB CpuGpuEvent](https://github.com/vllm-project/vllm/blob/7a64fb8fc9239cb65e0df9313fa759594dfb206a/vllm/distributed/eplb/eplb_utils.py#L49-L59) constructs `torch.Event()`. |
| Current stream queried for an explicit tensor device | [Mooncake embedding backend](https://github.com/vllm-project/vllm/blob/7a64fb8fc9239cb65e0df9313fa759594dfb206a/vllm/distributed/ec_transfer/ec_connector/mooncake_store_embedding/backend.py#L209-L214) records a `torch.Event` on `torch.accelerator.current_stream(tensor.device)`. |

Earlier merged migrations include #36085 (synchronization), #36145 (device count/current device/device selection), and #36144 (device contexts). These establish existing API use; runtime validation of this patch remains pending as described above.

### Compatibility and scope

Generic streams do not expose the `.cuda_stream` field consumed by the current NCCL wrappers. Communication stream lookups and stream constructors/contexts are retained, including sharded-RDT contexts that update vLLM's cached current-stream tracking. Device UUID lookup and CUDA IPC collection also remain unchanged.

The earlier global event migration was reverted in #47668 because `torch.Event` ignored the `blocking` parameter ([upstream explanation](https://github.com/vllm-project/vllm/pull/47081#issuecomment-4874967250)). This patch only replaces default, nonblocking events.

Duplicate-work checks covered #30679 and its comments, open PRs mentioning it, and `weight_transfer accelerator`. #57374 overlaps the NCCL post-send availability check and changes that stream lookup through vLLM's helper as part of a new transport. This patch additionally covers IPC, packed-buffer stream tracking, sparse NCCL synchronization, and sharded-RDT device/event handling. #57022, #33225, and #37134 address stream/platform or communicator migrations; their interfaces are retained here. This patch does not add a transport or change rendezvous behavior.

AI assistance was used to implement this change and prepare this description.

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

