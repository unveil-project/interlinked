Passing a huge offset-from-end to `--line-range` (e.g. `:-999999999999999999` or `-999999999999999999:`) aborted bat with a `capacity overflow` panic instead of printing. The offset is parsed as an unbounded `usize` and was passed straight into `VecDeque::with_capacity` in `print_file_ranges`; the `+ 1` on top of it also overflowed for `N == usize::MAX`.

The buffer no longer pre-allocates from the user-controlled offset — it grows as lines are read, which is bounded by the actual input size. The logical buffer size (used for the sliding window) keeps `offset + 1` via `saturating_add`, so range behavior is unchanged.

Fixes #4039, fixes #3845.