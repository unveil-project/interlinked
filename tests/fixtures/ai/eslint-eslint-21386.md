#### Prerequisites checklist

- [x] I have read the [contributing guidelines](https://github.com/eslint/eslint/blob/HEAD/CONTRIBUTING.md).

#### AI acknowledgment

- [x] I _did_ use AI to generate parts of this PR.

#### What is the purpose of this pull request? (put an "X" next to an item)

- [ ] Documentation update
- [x] Bug fix ([template](https://raw.githubusercontent.com/eslint/eslint/HEAD/templates/bug-report.md))
- [ ] New rule ([template](https://raw.githubusercontent.com/eslint/eslint/HEAD/templates/rule-proposal.md))
- [ ] Changes an existing rule ([template](https://raw.githubusercontent.com/eslint/eslint/HEAD/templates/rule-change-proposal.md))
- [ ] Add autofix to a rule
- [ ] Add a CLI option
- [ ] Add something to the core
- [ ] Other, please explain:

#### What changes did you make?

`no-unsafe-optional-chaining` visits every context that cannot take `undefined`: call, construct, member, spread, relational, `with`, `extends`, destructuring, `for...of`, tagged template. `YieldExpression` was missing, so a delegating `yield*` on a short-circuiting chain was never reported:

```js
/* eslint no-unsafe-optional-chaining: "error" */

function* gen(obj) {
  yield* obj?.items; // not reported; throws at runtime
}
```

The fix visits `YieldExpression` and recurses into `node.argument` **only** when the `delegate` flag is set. That flag is the distinction between `yield*` and `yield`:

- `yield* undefined` → `TypeError: undefined is not iterable` → unsafe, must be reported.
- `yield undefined` → perfectly legal, yields `undefined` to the caller → must not be reported.

I first implemented this by recursing into *every* `YieldExpression` argument and the rule broke the valid case, so the guard is load-bearing rather than defensive.

#### What I did not change

`yield* (yield obj?.foo)` stays unreported. Tracing the semantics: the inner `yield` evaluates `obj?.foo` and hands `undefined` to the caller, which is legal; the outer `yield*` then iterates whatever the caller sends back with `next()`. The short-circuit therefore does not reach `yield*` as an operand, so no extra recursion is needed. I left a valid test case for it.

#### Is there anything you'd like reviewers to focus on?

The `node.delegate` check. If you'd rather treat a nested `yield` as tainted too, that's a one-line change but it would be a semantic widening beyond what the issue reported.

#### Test plan

- New invalid case `function* foo() { yield* obj?.bar; }`.
- New valid cases `function* foo() { yield foo?.bar; }` and `function* foo() { yield* (obj?.foo ?? bar); }`.
- Verified the new invalid case **fails** on `main` with "Should have 1 error but had 0" and passes with the fix (ran both by stashing the rule).
- `tests/lib/rules/no-unsafe-optional-chaining.js`: 190 passing.
- `no-unsafe-optional-chaining` + `tests/lib/configs/*` + `tests/lib/rule-tester/*`: 480 passing, no regressions.
- `node Makefile.js checkRuleExamples` exit 0 (the docs examples are parsed by that script, so both new snippets are verified).
- `node tools/update-rule-type-headers.js --check` exit 0; `prettier --check` clean; the repo's own eslint on both changed JS files exit 0.
- Not run: the full CI matrix (browser/ecosystem-plugin jobs). Those are infra-level; the only behavior change is one rule.

#### Docs

Updated `docs/src/rules/no-unsafe-optional-chaining.md` with the `yield*` incorrect example and a `yield` correct example.


<!-- This is an auto-generated comment: release notes by coderabbit.ai -->
## Summary by CodeRabbit

* **Bug Fixes**
  * Unsafe optional chaining is now detected in delegated `yield*` expressions, including when the value is used with arithmetic operators and arithmetic checks are enabled.
  * Optional-chain results in ordinary `yield` expressions remain allowed and are not reported as unsafe.

* **Documentation**
  * Clarified examples showing the difference between `yield` and `yield*` when used with optional chains.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->