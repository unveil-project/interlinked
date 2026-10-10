`Condition::matches_list` returned true as soon as one value passed `matches`, and for `!=` / `!~` that check is already negated per value. So `taskTag!=runner-gpu` kept a task tagged `[runner-gpu, docker]` (because `docker` differs) and dropped tasks with no tags.

For negated operators the list now matches only when none of its values match the positive form, so an empty list matches. The same function backs the taskToolchain, projectTag and projectAlias lookups, so they get the same behavior. Callers that skip empty lists before calling it are unchanged.

Adds unit tests for all four operators over matching, non-matching and empty lists. moon_query tests, rustfmt and clippy pass; I did not run the cli integration tests.

Fixes #2744.