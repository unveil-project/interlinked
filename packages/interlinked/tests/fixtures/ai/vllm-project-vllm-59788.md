## Purpose

With the V2 model runner, requests without an explicit `seed` sample from randomness that is **identical across data-parallel engines**, because every DP engine seeds its RNGs with the same engine `seed`. The n-th unseeded request on each DP rank therefore samples the same tokens. Two sampling paths are affected:

1. **Gumbel path** (no top-k/top-p): an unseeded request gets a per-request seed from the worker's global NumPy RNG (`SamplingStates.add_request`, `np.random.randint`).
2. **Fused FlashInfer path** (top-k/top-p, e.g. the `top_p=0.95` many models ship in `generation_config.json`): `flashinfer_sample` draws from the device's default CUDA generator.

This PR seeds both from a per-rank `np.random.SeedSequence((model_config.seed, data_parallel_rank))`: the default per-request seeds come from a `np.random.Generator`, and the fused sampler gets its own `torch.Generator` (passed through a new `generator` argument of `flashinfer_sample`). Streams stay reproducible for a given engine seed; requests with an explicit `seed` are unchanged.

Impact seen in practice: in a verl GRPO/DAPO rollout with one DP4 replica (128 prompts × 8 siblings, temperature 1.0, top_p 1.0, no per-request seed), only **392 of 1024** responses were distinct (up to 4 copies = DP size).

## Test Plan

- Unit: `tests/v1/worker/test_gpu_sampler_flags.py` (default seeds and fused-sampler generator differ per DP rank, reproducible per rank, explicit seeds kept) and `tests/v1/sample/test_topk_topp_sampler.py::test_flashinfer_sample_draws_from_the_given_generator`.
- Minimal repro: `vllm serve` with `--data-parallel-size 4 --enable-expert-parallel` (V2 runner), the same prompt sent once to each DP rank via `X-data-parallel-rank`, temperature 1.0, no seed, three rounds; plus controls (4 requests to one rank; explicit per-rank seeds).
- E2E: verl DAPO recipe, rollout DP4/EP4, distinct responses per step.

## Test Result

- Unit: **20 passed** (GB200; build based on `7f1a5398` with the identical patch, which applies cleanly to `main`; `pre-commit` passes).
- Minimal repro (model default `top_p=0.95`, i.e. the fused path):
  - before: distinct outputs across the 4 ranks per round = **1, 1, 1**; same-rank requests differ; explicit per-rank seeds differ.
  - after: **4, 4, 4**; explicit-seed outputs are byte-identical to before.
- E2E rollout (top_p 1.0, i.e. the Gumbel path): distinct responses **392 → 1024 of 1024** (three consecutive steps all 1024/1024). Train/inference logprob parity of that run is unaffected (sampling randomness only).

## Duplicate check

Searched vllm-project/vllm issues and PRs (`data parallel seed`, `default seed data_parallel_rank`, `identical outputs data parallel`, `SamplingStates seed`, `duplicate samples DP`): no existing report or fix. `main` still uses the global NumPy RNG and the default CUDA generator here.

## AI assistance

This change was developed with AI assistance (Claude Code). The submitter has reviewed every changed line and the test results above.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
