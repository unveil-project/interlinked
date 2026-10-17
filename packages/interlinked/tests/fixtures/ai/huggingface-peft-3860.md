# What does this PR do?

`prepare_model_for_kbit_training(..., auto_clear_cache=True)` is documented to release the accelerator
allocator cache after the bulk fp16/bf16 → fp32 casts, but the implementation only clears the CUDA and
XPU caches. On every other accelerator the flag is a silent no-op, so the blocks that the casts just
freed are kept reserved by the allocator and never handed back.

This PR adds the missing Ascend NPU branch, using the same pattern as the existing `is_xpu_available()`
branch (`is_npu_available` is already imported in this module):

```python
if is_xpu_available():
    torch.xpu.empty_cache()

if is_npu_available():
    torch.npu.empty_cache()
```

## Why this matters on NPU

Same rationale as #3265, which motivated the CUDA/XPU branches: on devices that share their memory with
the host, freed allocator blocks are not returned until the cache is flushed. An Ascend NPU is such a
device, and `auto_clear_cache=True` is the documented switch that is supposed to trigger the flush.
Today NPU users get a silent no-op: the model is cast to fp32 while the allocator keeps holding the
(now unused) fp16 blocks.

Only the comment is reworded to be device-generic; the CUDA/XPU behaviour is untouched, and the new
branch is only reachable when `is_npu_available()` is true.

## Changes

- `src/peft/utils/other.py` (+3/-1): add the `is_npu_available()` branch, make the comment
  device-generic.
- `tests/test_other.py`: two new CPU tests — NPU available → cache is cleared; NPU unavailable → cache
  is left alone.
- `tests/test_common_gpu.py`: the existing `test_prepare_model_for_kbit_training_no_memory_leak` guard
  for #3265 is no longer skipped on NPU, so NPU is now covered by that regression test too.

## Verification

Tested on a real Ascend 910 machine (2 × Ascend910_9362), `torch 2.9.0+cpu`, `torch_npu 2.9.0.post1`,
with the hunk above applied to the peft installed in that environment (0.21.1).

Repro: burn ~1 GiB through the NPU caching allocator, free it (`del` + `gc.collect()`), then call
`prepare_model_for_kbit_training(model, use_gradient_checkpointing=False, auto_clear_cache=...)` and
read `torch.npu.memory_reserved(0)` before/after:

| source | `auto_clear_cache` | `torch.npu.empty_cache()` calls | reserved before → after |
|---|---|---|---|
| upstream | `False` | 0 | 260.0 MiB → 260.0 MiB (Δ 0.0) |
| upstream | `True` | **0** | 260.0 MiB → 260.0 MiB (**Δ 0.0**, flag is a no-op) |
| this PR | `True` | **1** | 260.0 MiB → **2.0 MiB** (**Δ −258.0**) |

The added tests, run on that machine against the installed source:

| source | result |
|---|---|
| upstream (NPU branch removed) | **1 failed** (`test_auto_clear_cache_npu`), 4 passed |
| this PR | **5 passed** |

## Not tested

- CUDA and XPU paths: no access to those devices. The new branch cannot run there
  (`is_npu_available()` is false), and the CUDA/XPU branches were not modified.
- `use_gradient_checkpointing` handling and the rest of `prepare_model_for_kbit_training` are unchanged.
- The full peft test suite was not run (the NPU machine has no GPU-CI parity); only the tests added or
  touched by this PR were executed.
