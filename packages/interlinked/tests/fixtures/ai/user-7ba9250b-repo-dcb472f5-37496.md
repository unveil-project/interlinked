## Current Behavior

`ci-state-update.mjs` in the `monitor-ci` skill reads each counter with `parseInt(getArg(...) || '0', 10)`. A non-numeric value becomes `NaN`, and since `NaN >= max` is always false, `gate` keeps returning `allowed: true` and `cycle-check` never sets `limitReached` or `approachingLimit`. Negative values slip through as well, so the local-fix, env-rerun, and cycle budgets can silently stop applying.

## Expected Behavior

A counter or maximum that isn't a non-negative integer is treated as an exhausted budget:

- A new `getCount` helper keeps the default only when the argument is omitted, accepts digits-only values, and returns `NaN` for anything else.
- Budget checks use `!(count < max)`, which is true for `NaN`, so an invalid count or max fails closed.

With this change, `gate --gate-type local-fix --local-verify-count abc` returns `allowed: false`, and `cycle-check --code failed --cycle-count abc` reports `limitReached: true`.

The script exists in `.github/skills`, `.agents/skills`, and `.opencode/skills` (identical copies), so all three are updated together. A new `scripts/monitor-ci/ci-state-update.spec.mjs` (run with `node --test`, 36 passing) covers defaults, in-range values, and the non-numeric, negative, decimal, signed, and partial inputs, and asserts the three copies stay identical.

Note: these copies come from `nrwl/nx-ai-agents-config`, which still has the `parseInt` version, so the template there may want the same change.

## Related Issue(s)

Fixes #37378