I want to merge this change because two accepted `transactionEventReport` charge events can leave the transaction charged total reflecting only the first. Fixes #19854.

This PR adds one native GraphQL regression using Saleor's existing `race_condition.RunBefore` helper. It delivers 7.00 and 11.00 charge reports with distinct provider references, pauses the first just before saving its computed total, completes the second, then resumes the first. Both events are stored and both retries are acknowledged, but current `main` ends at 7.00 instead of 18.00. The test is a **strict expected failure** until the projection write is serialized or otherwise made convergent. It adds no harness dependency and no production change.

This interleaving was found with [due-work-harness #36](https://github.com/gigaverse-app/due-work-harness/pull/36). The harness binds real application commands and observations, then generates replay, crash, and event-order histories from a compact adopter declaration; [Saleor #19836](https://github.com/saleor/saleor/pull/19836) illustrates how one declaration yields cases without hand-writing each history. Payment systems benefit because separately valid provider callbacks can race into a false money total. The harness has been exercised with Kafka, MongoDB, PostgreSQL, Django, and Celery ([core #34](https://github.com/gigaverse-app/due-work-harness/pull/34)); [Shopify/Airbyte integration](https://github.com/gigaverse-app/due-work-harness/pull/37) is in progress. It also exposed pre-fix TapIn/Gigaverse backend bugs in [#5094](https://github.com/gigaverse-app/gigaverse-backend/pull/5094). This regression remains a normal Saleor test.

# Impact

- [ ] New migrations
- [ ] New/Updated API fields or mutations
- [ ] Deprecated API fields or mutations
- [ ] Removed API types, fields, or mutations

# Docs

No documentation change; this records a confirmed issue as a strict expected failure.

# Pull Request Checklist

- [x] Privileged queries and mutations are either absent or guarded by proper permission checks
- [x] Database queries are optimized and the number of queries is constant
- [x] Database migrations are either absent or optimized for zero downtime
- [x] The changes are covered by test cases
- [x] All new fields/inputs/mutations have proper labels added (`ADDED_IN_X`, `PREVIEW_FEATURE`, etc.)
- [x] All migrations have proper dependencies
- [x] All indexes are added concurrently in migrations
- [x] All RunSql and RunPython migrations have revert option defined

Local verification: the unmarked test failed at `charged_value == 18.00` with actual 7.00; with the strict marker it reports `1 xfailed`. Ruff check and format check pass.
