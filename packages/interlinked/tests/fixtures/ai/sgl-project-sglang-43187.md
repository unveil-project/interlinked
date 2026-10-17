## Motivation

Follow-up to the per-rank DP attention imbalance metrics (#42755 in `main`'s history). Downstream metrics gateways with a fixed bucket preset drop a series when a boundary is not in the preset; the `bucket_backup_duration` and eviction-duration ladders in `metrics_collector.py` say so in their comments and keep to a coarse, widely supported set for that reason. The `sglang:dp_attention_token_imbalance_ratio` ladder was hand-picked instead (1.0, 1.05, 1.1, 1.25, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64), which makes it the DP attention series most likely to be dropped by such a gateway while the others are kept.

## Modifications

- `SchedulerMetricsCollector`: the ratio histogram now uses a coarse progression of common steps, 1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10, 15, 20, 30, 45, 60. The histogram's `_sum` and `_count` are unchanged, so the mean ratio is exact either way; only the quantile estimate between 1.0 and 1.5 loses resolution. The top bound stays near the previous 64, so a single-busy-rank step (ratio == `num_dp_ranks`) remains in a finite bucket for DP attention groups of up to 60 ranks.
- `test_forward_pass_metrics.py::TestDPBalanceMetrics`: a new case collects the `le` labels of the exported ratio histogram from a private registry and pins the ladder, so a later edit cannot regress this silently. It fails on the previous ladder and passes on this one.

## Accuracy Tests

Not applicable; metrics only, no change to model outputs.

## Speed Tests and Profiling

Not applicable; the bucket tuple is read once at collector construction.

## Checklist

- [x] Format your code according to the [Format code with pre-commit](https://docs.sglang.io/developer_guide/contribution_guide.html#format-code-with-pre-commit): isort 7.0.0, ruff 0.15.1 (`check` with the repo's selected rules and `format --check`) and codespell 2.4.1 pass on both changed files.
- [x] Add unit tests according to the [Run and add unit tests](https://docs.sglang.io/developer_guide/contribution_guide.html#run-and-add-unit-tests): `test/registered/unit/observability/test_forward_pass_metrics.py` passes locally on this branch (22 passed, including the new case).
- [ ] Update documentation according to [Write documentations](https://docs.sglang.io/developer_guide/contribution_guide.html#write-documentations).
- [ ] Provide accuracy and speed benchmark results according to [Test the accuracy](https://docs.sglang.io/developer_guide/contribution_guide.html#test-the-accuracy) and [Benchmark the speed](https://docs.sglang.io/developer_guide/contribution_guide.html#benchmark-the-speed).
- [x] Follow the SGLang code style [guidance](https://docs.sglang.io/developer_guide/contribution_guide.html#code-style-guidance).

<!-- pr-states:start -->
---
### CI States

Latest PR Test (Base): <!-- slot:pr-test:start -->:x: [Run #37825503260](https://github.com/sgl-project/sglang/actions/runs/37825503260)<!-- slot:pr-test:end -->
Latest PR Test (Extra): <!-- slot:pr-test-extra:start -->:x: [Run #37825523174](https://github.com/sgl-project/sglang/actions/runs/37825523174)<!-- slot:pr-test-extra:end -->
Latest PR Test (AMD ROCm 10): <!-- slot:pr-test-amd:start -->:x: [Run #37825503189](https://github.com/sgl-project/sglang/actions/runs/37825503189)<!-- slot:pr-test-amd:end -->
<!-- pr-states:end -->