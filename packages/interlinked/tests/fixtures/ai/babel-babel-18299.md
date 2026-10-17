AI-generated description. The implementation, tests, and technical reviews used GPT-6.1 Sol and GPT-6. The commits include `Assisted-by` attribution.

| Q | A |
| --- | --- |
| Fixed Issues? | Reproducer and regression included; no separate issue claimed fixed |
| Patch: Bug Fix? | Yes |
| Major: Breaking Change? | No |
| Minor: New Feature? | No |
| Tests Added + Pass? | Yes |
| Documentation PR Link | Not applicable |
| Any Dependency Changes? | No |
| Need backport? | Not included |
| License | MIT |

When an object pattern contains rest, `DestructuringTransformer.pushObjectPattern` hoists every impure computed key before processing any property. This evaluates later keys before earlier getters/defaults and can change which exception wins.

```js
const events = [];
const key = name => (events.push("key:" + name), name);
const input = {
  get a() { events.push("get:a"); return 1; },
  get b() { events.push("get:b"); return 2; },
};
const { [key("a")]: a, [key("b")]: b, ...rest } = input;
// Native: key:a, get:a, key:b, get:b
// Current lowering: key:a, key:b, get:a, get:b
```

Memoize each impure key immediately before lowering its own property. Keep the memoized key in the copied pattern for the eventual rest exclusion list. Nested reads/defaults now finish before the next property's computed key.

The tests cover declarations, assignments, parameters, nested patterns, and competing getter/default/key exceptions. One output fixture changes to the corrected ordering. This patch targets the destructuring utility; the companion object-rest assignment patch (#18300) repairs a separate lowering path. Repeated `ToPropertyKey` coercion tracked in #13514 remains outside this repair.

`yarn jest babel-plugin-transform-destructuring babel-plugin-transform-object-rest-spread --runInBand`: 185 tests pass. Both new exec fixtures fail with the production repair absent, including a fixture that selects only `transform-destructuring`.

The unchanged regression was run after rebuilding with the production repair absent, then again after restoring and rebuilding it. Package imports resolved to the checkout. Targeted type, lint, and formatting checks passed.

This patch was also tested in the combined eight-repair checkout: 276 suites passed in both default and Babel 9 configurations (37,000 and 37,001 tests respectively, 280 snapshots each), with repository `make lint` passing. The discovery generators and fast-check dependency remain off this PR branch.
