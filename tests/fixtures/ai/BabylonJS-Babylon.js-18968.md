Anyone using `Tags.MatchesQuery`, `scene.getMeshesByTags` or `AndOrNotEvaluator.Eval` directly with a query like `"player || enemy && alive"` gets `false` for an object that only has the `player` tag, so the object is silently left out of the result.

In `_HandleParenthesisContent`, the early exit for a true `||` operand ran after the next operand's `&&` chain had already overwritten `result`. When a true operand was followed by an `&&` chain that evaluated to false, the true was lost. The loop now stops as soon as an earlier operand has evaluated to true.

Before the change, with only `a` true:

```
Eval("a || b && c", ["a"])           -> false (expected true)
Eval("a || b && c || d", ["a"])      -> false (expected true)
```

`a || b`, `a && b || c` and `(a || b) && c` were already correct and are covered by the new test as well.

Test: `packages/dev/core/test/unit/Misc/babylon.andOrNotEvaluator.test.ts`. Two of its three tests fail on the previous `andOrNotEvaluator.ts` and all three pass with this change.
