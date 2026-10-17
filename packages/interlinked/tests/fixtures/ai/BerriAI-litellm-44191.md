## TLDR

Problem this solves:

- Older AnyIO releases can strand cancelled lock waiters
- LiteLLM's package metadata allows those releases

How it solves it:

- Require AnyIO 4.14.0 or newer
- Lock and test the direct dependency floor

## User Flow

Before: an operator can install an affected AnyIO release, allowing a cancelled waiter to block later registry requests

1. They install LiteLLM v1.101.0 or newer, and the resolver accepts AnyIO 4.13.0
2. Their service cancels a task waiting on a shared registry lock
3. Later requests that need that registry stop progressing

After: the dependency floor keeps cancelled waiters from blocking later registry requests

1. They install a LiteLLM build containing this change, and the resolver requires AnyIO 4.14.0 or newer
2. Their service cancels a task waiting on a shared registry lock
3. Later requests that need that registry keep progressing

## Relevant issues

Fixes #44048

## Affected release

Regression since v1.101.0

## Pre-Submission checklist

**Please complete all items before asking a LiteLLM maintainer to review your PR**

- [x] I have added meaningful tests
- [x] The handful of test files covering my change pass locally, e.g. `uv run pytest tests/unit/<your_test_file>.py -v`. Leave the suites (`make test-unit-*`, `make test-unit`) to CI: it finishes in ~15 minutes where a laptop takes an hour or more
- [ ] My PR passes all required CI/CD checks (e.g., lint, schema.d.ts sync check, etc.)
- [x] My PR's scope is as isolated as possible; it only solves 1 specific problem
- [ ] I have received a Greptile **Confidence Score of at least 4/5** before requesting a maintainer review (Greptile reviews automatically once the PR is opened; only comment `@greptileai` to re-request a review after pushing changes)

## Delays in PR merge?

If you're seeing a delay in your PR being merged, ping the LiteLLM Team on [Slack (#pr-review)](https://join.slack.com/t/litellmossslack/shared_invite/zt-3o7nkuyfr-p_kbNJj8taRfXGgQI1~YyA)

## Screenshots / Proof of Fix

### Before (615ed79)

1. Run `uv pip compile pyproject.toml --no-deps --no-sources --resolution lowest-direct --python-version 3.10 -o /tmp/litellm-44048-before.txt`
2. Run `rg '^anyio==' /tmp/litellm-44048-before.txt || echo 'No direct AnyIO requirement'`
3. Observe `No direct AnyIO requirement`

### After (2c168d7)

1. Run `uv pip compile pyproject.toml --no-deps --no-sources --resolution lowest-direct --python-version 3.10 -o /tmp/litellm-44048-after.txt`
2. Run `rg '^anyio==' /tmp/litellm-44048-after.txt || echo 'No direct AnyIO requirement'`
3. Observe `anyio==4.14.0`

## Type

Bug Fix

Infrastructure

Test

## Final Attestation

- [x] The tests check the right things, including the edge cases, and regressions in the respective real-world customer use-cases are not possible after this PR
