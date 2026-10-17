Calling `tf.raw_ops.ExtractImagePatches` with non-positive spatial attributes (such as `ksizes=[1, -1, 2, 1]`) passes negative values to `InferenceContext::Multiply` / `DimensionOrConstant`, triggering a fatal `CHECK` abort in debug builds (`Check failed: val >= 0 || val == InferenceContext::kUnknownDim`). In release builds, negative dimensions propagate into graph construction, leading to corrupted shapes or crashes. Reported in #63067.

### Reproducer
```python
import tensorflow as tf

tf.compat.v1.disable_eager_execution()

# Spatial ksizes contains negative value
tf.raw_ops.ExtractImagePatches(
    images=tf.random.normal([1, 1, 1, 1]),
    ksizes=[1, -1, 2, 1],
    strides=[1, 1, 1, 1],
    rates=[1, 1, 1, 1],
    padding="VALID",
)
```

Before this change:
Debug build triggers `CHECK` failure and aborts:
```
F ./tensorflow/core/framework/shape_inference.h:891] Check failed: val >= 0 || val == InferenceContext::kUnknownDim
Dimension must be non-negative or equal to InferenceContext::kUnknownDim but got -2
Aborted (core dumped)
```

After this change:
Raises `tf.errors.InvalidArgumentError: ExtractImagePatches requires spatial ksizes to be positive, but got: [-1, 2]` gracefully.

### Root Cause
In `tensorflow/core/ops/array_ops.cc`, the shape inference functions for `ExtractImagePatches` and `ExtractVolumePatches` validated attribute vector lengths (`size() == 4` or `5`), but did not validate that spatial attributes are positive integers before passing them to `c->Multiply()` and `GetWindowedOutputSizeVerbose()`.

### Solution
- Added explicit validation in `ExtractImagePatches` shape inference checking that spatial `ksizes`, `strides`, and `rates` (indices 1 and 2) are positive (`> 0`), returning `absl::InvalidArgumentError` otherwise.
- Added corresponding checks in `ExtractVolumePatches` shape inference for spatial `ksizes` and `strides` (indices 1, 2, and 3).
- Added unit tests in `extract_image_patches_op_test.py` and `extract_volume_patches_op_test.py` verifying that negative and zero spatial attributes raise `InvalidArgumentError` / `ValueError` across graph and eager modes.

Fixes #63067.
