Hi — really interesting project. The token-level drift detection with the ladder policy (noop → bias → clamp → mask → rollback) is a clean control abstraction.

I wanted to raise a thought on extending the drift observability across sessions.

## Current state

ATLAS-RTC tracks `drift_score` per decode step within a single generation and writes JSONL traces per run. The ladder policy reacts to within-request drift. This covers the "is this specific generation drifting?" question well.

## Gap: what happens to drift behavior over time?

Each run produces a drift score distribution (mean, variance, max, intervention frequency). If you accumulate these distributions across hundreds of runs on similar contracts, you get a time series of drift behavior. That time series can answer a different question:

> "Is the model's baseline drift behavior changing, even when contracts stay the same?"

This shows up operationally when:
- **Model provider silently updates weights** — drift scores shift without any code change
- **Context contamination accumulates** — similar prompts start drifting more over time  
- **Infrastructure regression** — serving changes (quantization, batching, routing) alter generation characteristics

## Concrete suggestion

Add an optional longitudinal tracking mode to `EventLogger`:

1. **Per-run summary:** After each run, compute summary stats (mean/max drift, intervention counts by type, correction rate) and append to a session-level manifest
2. **Trend detection:** Flag when rolling-average drift crosses a threshold (simple SPC-style: 3σ from the trailing mean)
3. **Cross-session correlation:** When a drift trend is detected, surface what changed (model version? contract type? input distribution?)

The key insight: your per-step drift score is already the right measurement. The gap is accumulating it across sessions rather than treating each run as independent.

## Why I'm interested

I work on [Production Drift Report](https://doi.org/10.5281/zenodo.19028012) — a framework for measuring cross-session behavioral drift in autonomous AI agents. We track drift across thousands of automated cycles. ATLAS-RTC's decode-level drift scores are a natural input signal: within-generation drift patterns accumulated over time become a cross-session drift metric.

The two projects cover complementary failure surfaces:
- **PDR:** "Is the agent's behavior changing across sessions?" (behavioral drift)
- **ATLAS-RTC:** "Is this specific generation drifting from the contract?" (runtime control)

Combined: ATLAS-RTC drift scores as longitudinal input → PDR cross-session trend detection → flag when runtime drift baseline shifts

If this is interesting, happy to share production event-log samples tagged with trajectory structure for benchmarking. Also curious whether you've observed drift score distributions shifting in your own benchmarks across model versions.

Thanks for the great work on this.
