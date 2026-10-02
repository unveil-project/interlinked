Anyone who passes `training_data` to `deepspeed.initialize` under a launcher (`local_rank >= 0`) gets the same sample order in every epoch, because the `DistributedSampler` that `DeepSpeedDataLoader` builds is never told the epoch changed.

`DistributedSampler` seeds its shuffle with `seed + epoch`, and its epoch only moves when someone calls `set_epoch`. Nothing under `deepspeed/` calls it, so every pass over the data repeats epoch 0. The single-process branch of the same class uses `RandomSampler`, which reshuffles on each pass, so the two branches disagree.

Running a loader over 8 samples with one batch per sample, three passes each, on master:

```
local_rank=0   [[4, 0, 7, 3, 2, 5, 1, 6], [4, 0, 7, 3, 2, 5, 1, 6], [4, 0, 7, 3, 2, 5, 1, 6]]
local_rank=-1  [[0, 5, 4, 6, 2, 7, 1, 3], [5, 4, 7, 6, 2, 1, 0, 3], [3, 0, 6, 5, 1, 7, 2, 4]]
```

The same through `deepspeed.initialize(training_data=...)` with one CPU process (`LOCAL_RANK=0`), on master and with this change:

```
master  [[4, 0, 7, 3, 2, 5, 1, 6], [4, 0, 7, 3, 2, 5, 1, 6], [4, 0, 7, 3, 2, 5, 1, 6]]
fixed   [[4, 0, 7, 3, 2, 5, 1, 6], [5, 4, 2, 6, 7, 3, 1, 0], [0, 4, 7, 2, 6, 5, 1, 3]]
```

The fix advances the epoch of the sampler `DeepSpeedDataLoader` created each time the loader is iterated again (this also covers `RepeatingLoader`, which calls `iter()` again when the loader is exhausted). It does not touch a sampler the caller passed in. The sampler is now a small `DistributedSampler` subclass that records calls to `set_epoch`: if the caller called it since the last pass, including with the value it already had, that epoch is used as given and counting continues from it. One consequence is that any extra `iter()` on the loader counts as a new pass, so `iter(loader)` followed by a full loop starts at epoch 1. As with a manual `set_epoch` loop, the ranks only stay disjoint if each rank iterates its loader the same number of times. Runs that rely on the old order will see a different order from the second epoch on.

The new tests in `tests/unit/runtime/test_data.py` compare each pass with the order a `DistributedSampler` gives for that epoch: advancing by default, keeping a caller-set epoch, keeping an epoch re-set to the same value before every pass, two ranks staying disjoint and matching the reference in each of three epochs, a caller-supplied sampler left alone, and a pass through `deepspeed.initialize(training_data=...)`. On master 4 of the 11 tests in the file fail and the other 7 pass; with the change all 11 pass. They ran with CPU-only torch and one process, so the two-rank test builds two loaders directly instead of launching two processes. `pre-commit run` passes on both changed files.
