
## PR Checklist
Please check if your PR fulfills the following requirements:

- [x] The commit message follows our guidelines: https://github.com/nestjs/nest/blob/master/CONTRIBUTING.md
- [x] Tests for the changes have been added (for bug fixes / features)
- [ ] Docs have been added / updated (for bug fixes / features)

## PR Type
What kind of change does this PR introduce?

- [x] Bugfix
- [ ] Feature
- [ ] Code style update (formatting, local variables)
- [ ] Refactoring (no functional changes, no api changes)
- [ ] Build related changes
- [ ] CI related changes
- [ ] Other... Please describe:

## What is the current behavior?

`Reflector.createDecorator<TParam>()` internally stores metadata values using `value ?? {}`.  
Because `null` is coalesced to `{}`, an explicit `@Decorator(null)` does **not** preserve the intended `null` value. The reflected result contradicts the decorator's TypeScript type contract.

Example:

```ts
const Metadata = Reflector.createDecorator<string | null>();

@Metadata(null)
class Test {}

// Expected: null
// Actual:   {}
new Reflector().get(Metadata, Test);
```

The same issue affects `transform` functions that intentionally return `null`.

Issue Number: N/A

## What is the new behavior?

Only a genuinely missing value (`undefined`) falls back to the empty-object marker used by argument-less decorators. An explicit `null` (or a transform result of `null`) is now preserved unchanged.

This is consistent with how `getAllAndOverride` already treats metadata — it skips `undefined` but keeps `null` as a legitimate value.

## Does this PR introduce a breaking change?
- [ ] Yes
- [x] No

The fallback to `{}` is only relevant for decorators called without arguments (e.g. `@Decorator()`). All existing non-null usages continue to behave identically.

## Other information

- Added four unit tests covering:
  1. explicit `null` metadata value
  2. `transform` returning `null`
  3. argument-less decorator still produces `{}`
  4. other falsy values (`0`, `''`, `false`) remain unchanged
