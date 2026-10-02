<!-- ci-dashboard-badge:start -->
[![CPU CI](https://transformers-ci.lor-e.huggingface.cool/badge/pr?pr=49257&event=pr-ci)](https://transformers-ci.lor-e.huggingface.cool/d/pytest-observability-by-pr/pytest-observability-branch?var-pr=49257) [![GPU run-slow](https://transformers-ci.lor-e.huggingface.cool/badge/pr?pr=49257&event=run-slow)](https://transformers-ci.lor-e.huggingface.cool/d/pytest-observability-by-pr/pytest-observability-branch?var-pr=49257)
<!-- ci-dashboard-badge:end -->

## What does this PR do?

Fixes #49233.

When generation expands a batch into multiple beams or returned samples, the score tensor has more rows than the cached encoder inputs. The processor currently gathers and scatters using the unexpanded source IDs, so hypotheses can receive another input's repetition penalty or no penalty. This expands source IDs locally to match the score rows while keeping the cached tensor unchanged.

## Testing

- Adds regression coverage for expansion factors 2 and 3, checking that every hypothesis uses the tokens from its own source row.
- Retains the existing unexpanded-batch regression test.
- The issue includes a minimal public generate() reproduction for greedy, beam, and multiple-return sampling. Upstream CI should validate the proposed patch against the repository's test matrix.
