Thanks for the review. I pushed fb73e27 with the follow-up changes:

- Added the configurable `linearBackoff(maxAttempts, initialDelay, maxDelay, increment, jitter)` overload.
- Kept the existing 3-arg `linearBackoff` compatibility path deterministic/uncapped.
- Updated `Presets.LINEAR` to call the capped overload with `JitterStrategy.NONE` and a 5s max delay.
- Added tests for capping, jitter bounds, invalid maxDelay/jitter args, max-attempt boundary, maxDelay < initialDelay, and cap-before-overflow behavior.

Verification run locally via Docker Maven:
- `mvn -pl sdk test -Dtest=RetryStrategiesTest,RetryDecisionTest`
- `mvn -pl sdk spotless:check`
- `mvn -pl sdk test`
- `git diff --check`
