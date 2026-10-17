## What

When `DeepSpeedConfig` takes sequence parallelism into account (no `mesh_device`; either an mpu that has
`get_sequence_parallel_world_size` but no `get_data_parallel_world_size`, or `sequence_parallel_size` in the
config with no mpu), it computes the data-parallel size with true division:

```python
self.world_size = dist.get_world_size() / mpu.get_sequence_parallel_world_size()
...
self.world_size = dist.get_world_size() / config["sequence_parallel_size"]
```

`world_size` is then a float. `_set_batch_related_parameters` derives the missing batch fields from it, so
`train_micro_batch_size_per_gpu`, `train_batch_size` and `gradient_accumulation_steps` all become floats too
(for example `train_batch_size=2, sequence_parallel_size=2` on 2 ranks gives a micro batch of `2.0`). In the
no-mpu branch, that float reaches `torch.utils.data.DataLoader` through `engine.deepspeed_io()`, which
`deepspeed.initialize` calls when `training_data` is passed
(engine.py, `self.training_dataloader = self.deepspeed_io(training_data)`). DataLoader rejects it:

```
ValueError: batch_size should be a positive integer value, but got batch_size=2.0
```

The mpu branch produces the same float batch sizes. With `parallel_state_sp`, `deepspeed_io` fails earlier
there for an unrelated reason (that module has no `get_data_parallel_world_size`), so I am not claiming the
DataLoader error for that path. The no-mpu branch is the one AutoSP configs take: `sequence_parallel_size`
set, no `data_parallel_size`, so no mesh is built in `deepspeed.initialize` (see
`tests/unit/v1/compile/test_compile_autosp.py`). An indivisible size (e.g. `sequence_parallel_size=3` on
2 ranks) is not rejected today; the config is accepted with `world_size = 2/3`.

## Change

- Add `_sequence_data_parallel_size(world_size, sequence_parallel_size)`. It raises `ValueError` unless
  `sequence_parallel_size` is a positive divisor of the world size, and otherwise returns
  `world_size // sequence_parallel_size`. Both SP branches use it. This matches what AutoSP already does in
  `deepspeed/compile/custom_ops/sp_dp_registry.py::extract_mesh_size`. It is a `ValueError` and not an
  `assert` on purpose, because the enclosing `try` catches `AssertionError` and would silently fall back to
  `world_size = 1`.
- In the no-mpu branch, read `sequence_parallel_size` from `self._param_dict` and not from the raw `config`
  argument. `config` can be a path or a base64 string (for example `zero.Init(config_dict_or_path=...)`),
  and in that case `"sequence_parallel_size" in config` is a substring test on the string.
  Note: #8542 (native Windows support) makes the same one-line `self._param_dict` change in this hunk. If
  that PR lands first I will rebase and drop it from here. The integer/divisibility change is not in #8542.
- #8685 edits the adjacent `except` fallback of the same block (and divides with `/=` there). The two
  changes do not overlap textually, but whichever merges second will need a trivial rebase.

## Tests

New `TestSequenceParallelBatchConfig` in `tests/unit/runtime/test_ds_config_dict.py` (2 ranks). All of it runs
at the config level:

- `test_dict_or_file[False|True]`: `{"train_batch_size": 2, "sequence_parallel_size": 2}`, passed as a dict
  and as a file. Expects `world_size == 1`, micro batch `2`, GAS `1`, train batch `2`, all `int`.
- `test_mpu_without_data_parallel_world_size`: an mpu that only exposes `get_sequence_parallel_world_size`,
  with the same expectations.
- `test_size_must_divide_world_size`: `sequence_parallel_size=3` on 2 ranks raises `ValueError`. The test
  uses try/except, not `pytest.raises`, because pytest's "DID NOT RAISE" is a `BaseException`. Inside
  `DistributedTest` it kills the pool worker, so the run hangs until `DS_UNITTEST_TIMEOUT` instead of
  failing.

Run on CPU (gloo):

```
cd tests
DS_ACCELERATOR=cpu LOCAL_SIZE=2 python -m pytest -q -p no:randomly unit/runtime/test_ds_config_dict.py \
    -k TestSequenceParallelBatchConfig
```

Before (master 3509874, test file only):

```
FAILED ...::test_dict_or_file[False] - AssertionError: world_size=1.0, expected 1
FAILED ...::test_dict_or_file[True] - AssertionError: world_size=2, expected 1
FAILED ...::test_mpu_without_data_parallel_world_size - AssertionError: world_size=1.0, expected 1
FAILED ...::test_size_must_divide_world_size - AssertionError: sequence_parallel_size=3 on 2 ranks was accepted
4 failed
```

After: the same 4 tests pass. They were run together with the neighbouring classes below: 10 passed in total,
which is the 6 that pass on master plus the 4 new ones. Existing tests in the same file are unchanged. On this machine,
`-k "TestBatchConfig or TestConfigLoad or TestInitNoOptimizer or test_get_bfloat16_enabled or TestArgs"`
gives 6 passed, 1 skipped and 5 failed both before and after the change. The 5 failures are
`KeyError: 'flags'` from building CPU Adam on Apple Silicon (`OpBuilder.simd_width`) and are not related to
this change. `unit/runtime/test_ds_config_model.py`: 15 passed.

yapf 0.43.0 (`.style.yapf`) and flake8 (`.flake8`) are clean on the changed files.

Not run locally: `tests/unit/v1/sequence_parallelism/test_ulysses.py` exercises the mpu branch (with this
change its micro batch becomes `2` where it was `2.0`), but it needs a GPU.

Environment: macOS arm64 (Apple M4), Python 3.12, torch 2.14.0 CPU, `DS_ACCELERATOR=cpu`. No GPU was used.
The change only touches config parsing.

AI assistance: this change was drafted with an AI coding assistant (Claude) and verified locally with the tests above.
