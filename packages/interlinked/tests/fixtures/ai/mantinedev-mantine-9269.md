## Summary

With `leading: true`, the first call runs immediately and `isPending()` returns `false`. Its debounce timer remains active to enforce the cooldown. Calling `flush()` during that cooldown currently invokes the callback again. The same duplication occurs with `flushOnUnmount: true`, or when `maxWait` expires before the cooldown ends.

This changes only the hook and its tests:

- Make the first leading call's `flush()` clear timers without replaying the completed callback.
- Require a pending callback before `maxWait` invokes it, and clear the expired max-wait handle even when nothing is pending.
- Preserve the leading cooldown, the original max-wait deadline during continuous calls, and flushing the latest pending arguments.

For example, with `delay: 100` and `leading: true`, call the debounced function once, then immediately call `flush()`. The callback should have run once; the original implementation runs it twice.

Seven additional test cases cover repeated flushes, unmounting, `maxWait` below/equal to/above `delay`, cooldown preservation and timer restart after an empty max-wait expiry, and flushing the latest pending call only once.

## Validation

[Hosted comparison](https://github.com/dvd233/flowgram.ai/actions/runs/37680329012), based on `f0e2bc6d28b0f0b8aaefb5b859937bf77f539df7`:

- Original `npm run build`: 30 packages built, zero skipped, in both base and candidate.
- Full `npm run typecheck`: root, docs and help-app checks passed in both.
- Focused tests: base 36/36; candidate 43/43.
- All hooks tests: base 567/567; candidate 574/574, across the same 64 suites.
- Full `npm run lint`, changed-file oxlint and changed-file formatting passed in both; formatting left the files unchanged.
- Reverting only the production fix while retaining the new tests produced four expected duplicate-call failures and 39 passes. Restoring the fix restored 43/43 passes.

Before typechecking, both lanes ran the original `npm run docs:sponsors` to generate the required docs build input. Tracked source files remained unchanged.

These runs used Node 26.3.0, Yarn 4.18.0 and an immutable install with dependency lifecycle hooks disabled. They do not establish a full-repository `npm test` or browser-validation pass.

This is an AI-assisted contribution.
