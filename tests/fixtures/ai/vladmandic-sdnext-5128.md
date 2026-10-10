## Summary

Three runtime paths release the device cache with a raw CUDA call: the ControlNet-XS pipeline, the HiDiffusion pipeline (both after `unet`/`controlnet` are moved back to CPU) and the leres depth helper (`modules/control/util.py::torch_gc`, imported by `.../leres/leres/depthmap.py` and `.../pix2pix/models/base_model.py`).

`torch.cuda.empty_cache()` only means anything on a CUDA build -- on any other backend it returns silently without releasing anything, so the release these paths intend never happens there. `devices.torch_gc()` resolves the active accelerator (`torch.accelerator` / `xpu`) and logs the release, and it is what the rest of the codebase already uses; `.github/instructions/core.instructions.md` asks for CUDA-neutral platform paths.

- `modules/control/util.py`: the local CUDA-only `torch_gc()` helper now delegates to `devices.torch_gc()`.
- `modules/hidiffusion/hidiffusion_controlnet.py`, `modules/control/units/xs_pipe.py`: the post-offload release uses `devices.torch_gc(force=True, reason=...)`, the same idiom as `modules/control/units/controlnet.py`. `force=True` keeps the previous unconditional release on CUDA.

## Testing

- `python -m py_compile` on the three files.
- On torch 2.8.0+cpu (CUDA-less build) `torch.cuda.empty_cache()` is a silent no-op, while `torch.cuda.ipc_collect()` raises `AssertionError: Torch not compiled with CUDA enabled` -- i.e. the replaced code did nothing on non-CUDA backends.
- Not tested: an end-to-end SD.Next run. No MPS/XPU/CUDA machine or model checkpoint is available in this environment, so the release after the change has not been observed on a live backend; CUDA behaviour is intended to be unchanged.
