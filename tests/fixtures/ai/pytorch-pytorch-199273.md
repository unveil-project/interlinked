## Summary

Fixes the memory cost described in #138248. `Adam` and `AdamW` with `betas[0] == 0.0` (the StyleGAN setup) used to allocate a first-moment buffer that is always equal to the gradient. That buffer is no longer allocated, so the optimizer state for those parameters is about half the size. The update is unchanged: the bias-corrected first moment is the gradient.

`AdamW` goes through `Adam`, so it gets the same behavior. `foreach=True` and `foreach=False` both do it. Three `OptimizerInfo` entries cover the zero-beta1 case, including a capturable one.

## What stays allocated

* `fused=True`. The fused kernels take the first-moment buffer as an argument, so it is still created.
* A tensor `betas[0]`. Whether it is zero is not known up front.
* A first moment that was already saved. Loading a state dict from a run that had `beta1 > 0`, or switching `beta1` to 0 after such a run, keeps that moment and keeps updating it. Dropping it would change the next step. Switching the other way (a state saved with `beta1 == 0`, then `betas` set to a positive value) creates the moment at zero on the next step.

`load_state_dict` also restores `betas`, so loading a checkpoint does not by itself change `beta1`. The switch is setting `param_groups[0]["betas"]` after the load. `test_adam_beta1_zero_skips_first_moment` covers the memory comparison, the update against the `beta1 == 0` formula, both switches, and that load-then-switch path.

## Test plan

I don't have an ATen build here, so I loaded `torch/optim/adam.py` from this branch into an installed PyTorch and checked it directly:

* 384 configurations (`Adam`/`AdamW`, `foreach`, `amsgrad`, weight decay, `maximize`, `decoupled_weight_decay`, real/complex, float32/float64, two `beta2` values), 6 steps, bit-identical to the installed Adam that always stores the moment, and `exp_avg` absent in every one. State bytes for a float32 parameter with no `amsgrad` went from 444 to 228.
* The formula check in the new test: five steps of fresh weights match `m = g`, `v = beta2 v + (1 - beta2) g^2` exactly (max abs diff 0, both `foreach` values).
* The load-then-switch and fused-keeps-the-buffer checks pass the same way.

CI still needs to run `test/test_optim.py` on this branch. I have not run that file through the repo harness.

