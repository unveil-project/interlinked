## Overview

Allocate R3 capture buffers in the V2 runner's `profile_run()`, before KV-cache memory profiling and outside the weights memory pool. Adopt the minimal two-phase connector initialization from [aoshen02/vllm#189](https://github.com/aoshen02/vllm/pull/189).

## Claims

- Create the AuxOutput connector and bind the capturer during profiling so automatic KV budgeting includes the persistent capture buffers and any monolithic routing sinks.
- Defer output storage until the resolved KV configuration is available, using `initialize_output_storage(kv_cache_config)` on the output TP rank. Retain connector construction as a fallback when normal profiling was skipped.
- Bump the Startup Plan schema to invalidate budgets recorded before this allocation moved into profiling.
- Keep GPUWorker, capturer binding, shutdown, and the existing R3 data-transfer paths unchanged from main. `profile_run()` creates the connector whenever aux output is enabled; this change does not guarantee repeated profiling is idempotent.

## Validation

Current head: `ab6712e28a0cd6ba437f1e0cace6097b136bcf8c`, based on main `df028dffa548710fb77320a5c08b87ae58757933`.

Checks completed locally:

- `ruff check` and `ruff format --check` on all six changed files: passed.
- `git diff upstream/main --check`: passed. All sixteen branch commits have DCO sign-off.
- Test tethering checks on the restored GPUWorker test file: passed; the two other test files passed this check in the preceding update.
- Three Startup Plan tests passed through an isolated pytest entry point that extracts the original test functions and fixture from `test_gpu_worker.py`, imports the real `startup_plan` module, and bypasses the global GPU conftest. They cover fingerprint sensitivity, budget application gates, and old-schema rejection. Hardware metadata is mocked by the existing fixture; cache JSON is actually written/read in temporary directories. This is not a full-suite pass.
- Negative control: setting the runtime schema to 1 caused the restored old-schema test to fail at the final budget assertion, as expected. Production files were not modified by this control.
- Four separate source-isolated runner/connector checks passed. They load actual definitions through AST, bypass Linux/GPU imports, and mock GPU helpers, covering profiling enabled/disabled, non-output TP rank and deferred storage.

The restored regression case saves a **1024-byte simulated budget**, changes the saved JSON schema to 1 while keeping its fingerprint, and verifies that the budget is not applied. It does not allocate GPU memory or measure R3 memory usage. Test changes are limited to `test_routed_experts_capture.py`, `test_gpu_model_runner_v2.py` and `test_gpu_worker.py`; the sleep-mode test file matches main.

The normal command `pytest -q tests/v1/worker/test_gpu_worker.py -k startup_plan` was attempted but collection was blocked by missing `uvloop` on Windows. Full `pre-commit run --files ...` remains blocked by Windows Git MSYS and hook-cache permission errors. Available checks were run directly. Mypy has no passing result.

GPU validation on this head is **not run**. R3 off/on KV-budget measurements, eager inference, sleep/wake, reload, CUDA Graphs, TP=2, explicit-KV-budget GPU behavior, Startup Plan first-boot/cache-hit behavior, sleep level 2, DP>1, and the monolithic sink GPU path remain unverified. No additional GPU E2E test is included in this diff. Earlier PR comments report results for older implementations and do not validate this head. No model-quality evaluation was run.

## Details

Previously `initialize_kv_cache()` constructed the connector after `determine_available_memory()` had fixed the automatic KV budget. The connector allocated persistent R3 GPU buffers too late to be accounted for.

The connector constructor now accepts the model and vLLM configuration, allocates the capturer and binds routing callbacks. Real KV initialization reuses that connector and calls `initialize_output_storage()` with the resolved layout; profiling KV initialization does not build the output data plane. Only the output TP rank builds the store and request buffer. The runner keeps the `None` fallback for initialization paths that skip normal profiling.

Production changes are limited to `gpu/model_runner.py`, `aux_output_connector/worker.py` and `startup_plan.py`. The earlier load-model initialization, ownership/unbind/rollback mechanisms and shutdown reordering have been removed. R3 SHM, prefix-cache, snapshots, asynchronous D2H and request-state behavior are unchanged.

Capture allocations remain resident outside the sleep allocator's weights/KV pools. Explicit `kv_cache_memory_bytes` remains a manual budget and is not automatically reduced.

This updates the existing upstream PR and incorporates all three commits from aoshen02/vllm#189, retaining cherry-pick provenance. It does not create a competing upstream PR. AI assistance was used for implementation, checks and preparation. Full runtime/GPU validation and human review remain outstanding before merge.

---

<details>
<summary> Pull Request Checklist </summary>

- [x] I used vLLM's `/pr-checklist` skill. (Mandatory for agents, optional for humans).
- [x] AI assistance was used during the creation of this PR.
- [x] **Design Fit:** Minimal V2 runner/connector fix; production changes limited to three files.
- [ ] **Testing and Validation:** Static and source-isolated checks passed; full pytest, full pre-commit, GPU reproducer and model evaluation remain outstanding as described above.
- [x] **Code Quality and Style:** Ruff and diff checks passed; no new user-facing options or unrelated production changes.
- [x] **Pull Request Contents:** Current behavior, source PR, root cause, provenance and validation limitations are documented.
</details>