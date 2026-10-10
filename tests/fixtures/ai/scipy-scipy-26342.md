#### Reference issue

Fixes #26340.

#### What does this implement/fix?

* Handles cancellation of the leading terms.
* Adds regression coverage for signs, axes, broadcasting, and input preservation.

The leading terms have equal exponents but opposite weights, so their combined weight becomes zero. The calculation divides by that zero and produces NaN. The fix uses the remaining scaled sum as the leading term when this cancellation occurs, while preserving the existing calculation otherwise.

#### Additional information

* 423 module tests passed.
* NumPy and Array API Strict: 837 passed, 2 expected failures.
* Broader special-functions suite: 8,963 passed, 636 skipped,
  52 expected failures, and one unrelated unexpected pass.
* Lint and whitespace checks passed.
* The full SciPy suite and other platforms were not tested.

#### AI Generation Disclosure

Codex generated the implementation and regression tests and assisted
with investigation and verification.