### What changes were proposed in this pull request?

Apply the retry policy's backoff multiplier on every attempt, then apply the optional maximum backoff. Add deterministic regression coverage for uncapped growth, capped growth, constant delays, decreasing delays, and retry exhaustion.

This PR is a draft pending a JIRA ticket.

### Why are the changes needed?

The Python Spark Connect client only updates its next delay when `max_backoff` is set. A custom policy with `initial_backoff=100`, `backoff_multiplier=2.0`, and `max_backoff=None` therefore returns `[100, 100, 100, 100]` instead of `[100, 200, 400, 800]`. This can retry faster than the configured policy intends. The Scala client already applies the multiplier independently of the optional cap.

### Does this PR introduce _any_ user-facing change?

Yes. Python custom retry policies with no maximum backoff now honor their configured multiplier. Policies with a maximum backoff, including the default policy, retain their existing behavior.

### How was this patch tested?

The new regression failed against unchanged production code for both growing and decreasing uncapped backoff, then passed after the fix.

Passed locally:

```sh
build/sbt -Phive -batch package
source .venv/bin/activate
python/run-tests --parallelism 1 --testnames 'pyspark.sql.tests.connect.client.test_client_retries,pyspark.sql.tests.connect.client.test_client'
dev/lint-python --ruff --compile
MYPYPATH=python mypy --config-file python/mypy.ini --follow-imports=silent python/pyspark/sql/connect/client/retries.py
git diff --check
```

### Was this patch authored or co-authored using generative AI tooling?

Generated-by: OpenAI Codex (GPT-6)
