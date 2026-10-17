## Motivation

Closes #42073. Sending weights before initializing the named group raises `KeyError` before the existing error-return branch can run.

## Modifications

Use `.get()` for the existence guard. Keep the existing failure message, group-name construction, broadcast and cleanup paths unchanged.

Add a registered CPU unit test for missing/None groups (TP sizes 1/2, both ranks), successful sending, and broadcast failure cleanup. Rejected requests must not touch the model/cache or modify unrelated groups.

## Validation

- Same test bytes against the full baseline/candidate `weight_exporter.py` on Linux/Python 3.12 with real Torch 2.11.0: baseline reproduces three missing-group `KeyError` subcases; candidate passes all three test methods. Success and broadcast-error controls pass both arms.
- This was an **isolated component replay**, with package/platform/common dependency shims and `CustomTestCase` mapped to `unittest.TestCase`; distributed operations were mocked. Exact upstream `NetworkAddress` and CI registration files were used. It is not a full-package import or server/NCCL test. The direct registered invocation still needs upstream CPU CI:
  `python3 test/registered/unit/model_executor/model_runner_components/test_weight_exporter.py`
- Ruff 0.15.1 checks/format, isort 7.0.0 with repository settings, registered-test/bare-pytest-main lint and `git diff --check` pass. Full pre-commit/CI was not run.

No inference-speed or model-accuracy claim; no GPU/model launch was used. AI assistance was used for source inspection, implementation and the executed component checks.

@slin1237 could you help trigger the registered CPU CI?

<!-- pr-states:start -->
---
### CI States

Latest PR Test (Base): <!-- slot:pr-test:start -->:x: [Run #36890338397](https://github.com/sgl-project/sglang/actions/runs/36890338397)<!-- slot:pr-test:end -->
Latest PR Test (Extra): <!-- slot:pr-test-extra:start -->:x: [Run #36890337846](https://github.com/sgl-project/sglang/actions/runs/36890337846)<!-- slot:pr-test-extra:end -->
Latest PR Test (AMD ROCm 10): <!-- slot:pr-test-amd:start -->:x: [Run #36890338462](https://github.com/sgl-project/sglang/actions/runs/36890338462)<!-- slot:pr-test-amd:end -->
<!-- pr-states:end -->
