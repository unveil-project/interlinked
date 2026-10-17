## PR Checklist
Please check if your PR fulfills the following requirements:

- [x] The commit message follows our guidelines: https://github.com/angular/angular/blob/main/contributing-docs/commit-message-guidelines.md
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
- [ ] Documentation content changes
- [ ] angular.dev application / infrastructure changes
- [ ] Other... Please describe:


## What is the current behavior?
The parse error effect in `NgControl.setParseErrorSource()` revalidates the control with `emitEvent: false`, so `statusChanges` never emits and the `markForCheck` subscription for custom controls does not run. A `FormValueControl` using `transformedValue` receives its `errors` input one change detection late under OnPush and zoneless.

Issue Number: #71127


## What is the new behavior?
The effect calls `markForCheck()` on the control's view directly, so parse errors reach the control in the same change detection pass. Tests cover `ngModel` and `[formControl]`.

Fixes #71127

## Does this PR introduce a breaking change?

- [ ] Yes
- [x] No


## Other information
Verified with `pnpm bazel test //packages/forms/signals/test/web:test_chromium`: the new tests fail without the source change and pass with it.
