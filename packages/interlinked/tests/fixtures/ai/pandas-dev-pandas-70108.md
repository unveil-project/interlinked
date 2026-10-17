- [x] closes #28487
- [x] [Tests added and passed](https://pandas.pydata.org/pandas-docs/dev/development/contributing_codebase.html#writing-tests) if fixing a bug or adding a new feature
- [x] All [code checks passed](https://pandas.pydata.org/pandas-docs/dev/development/contributing_codebase.html#pre-commit).
- [x] Added [type annotations](https://pandas.pydata.org/pandas-docs/dev/development/contributing_codebase.html#type-hints) to new arguments/methods/functions.
- [x] Added an entry in the latest `doc/source/whatsnew/vX.X.X.rst` file if fixing a bug or adding a new feature.
- [x] I have reviewed and followed all the [contribution guidelines](https://pandas.pydata.org/docs/dev/development/contributing.html)

`DataFrame.sum(axis=1)` on sparse columns used to build two arrays with `nrows * ncols` elements, the row codes (`np.tile`) and the densified values, before calling the groupby sum kernel. `SparseArray._groupby_op` also densified for groupby sums.

With a fill value of 0 or NaN, the fill values change the sum of a group only through `min_count` (zeros count as values) or `skipna` (NaNs). So the sum now runs the same cython kernel on the stored values plus at most `min(n_gaps, min_count)` zeros, or one NaN, per group. For `axis=1`, the row of a stored value is just its position in its column, so nothing of size `nrows * ncols` is created. Other fill values, and non-numeric subtypes, still take the existing path.

The results are identical to main (I compared 628 combinations, on integer-valued data, of int8/int64/uint64/float32/float64/bool subtypes, fill values, `skipna`, `min_count` and groupby `dropna`, with `check_exact=True`). The only difference is for floats: the kernel uses Kahan summation, and with fewer zeros in the input the result can differ in the last bit (up to about 2e-16 relative in my random tests).

Benchmark: 4-core Xeon, random columns, peak memory from `tracemalloc`:

| frame | fill | main | this PR |
|---|---|---|---|
| 10,000 x 100, density 0.01 | 0 | 8.8 ms, 15.8 MiB | 1.3 ms, 0.9 MiB |
| 200,000 x 200, density 0.001 | 0 | 356 ms, 619 MiB | 9.0 ms, 12 MiB |
| 200,000 x 200, density 0.001 | NaN | 316 ms, 619 MiB | 11.3 ms, 15 MiB |
| 1,000,000 x 100, density 0.001 | 0 | 795 ms, 1565 MiB | 27 ms, 57 MiB |

The example from the issue, scaled from `(2**30, 2**10)` to `(2**22, 2**10)` (an all-zero `coo_matrix`), now runs `sum(axis=1)` in 0.78 s with a 224 MiB peak and matches scipy. On main, the `nrows * ncols` row codes alone would need 32 GiB.

Why not `_reduce_axis1` (suggested in the issue): it is written for numpy blocks, and EA blocks are currently excluded from it (GH#65500). For sparse columns it would add each column into a dense accumulator of length `nrows`, which is O(nrows * ncols) time even when almost nothing is stored, and `min_count`/`skipna` would need separate handling. Going through the existing groupby `sum` kernel keeps the current results, dtypes and `min_count`/`skipna` handling exactly, with work proportional to the number of stored values plus `nrows`.

Groupby sums were already densified one column at a time, so they only use less memory per column. Their timings are about the same.

I added `FrameSumAxis1` to `asv_bench/benchmarks/sparse.py`.

Related: #68422 (open) avoids the same `nrows * ncols` row codes for masked and Arrow arrays. This PR is the sparse counterpart. Both touch the EA branch of `DataFrame._reduce(axis=1)`, so whichever merges second will need a small rebase.

Check exactly one of the following, per the [automated contributions policy](https://pandas.pydata.org/docs/dev/development/contributing.html#automated-contributions-policy):

- [x] I did **not** use AI to develop this pull request.
- [ ] I used AI to develop this pull request.
