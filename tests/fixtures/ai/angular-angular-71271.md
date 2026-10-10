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

A signal form registered as a WebMCP tool (`experimentalWebMcpTool`) loses the current value of every property the agent leaves out of its arguments, including nested ones.

The generated `inputSchema` only lists properties with a `required()` validator as required, so an agent can legitimately omit the rest. The tool's `execute` then applies the arguments with `node.value.set(args)`, which treats them as the complete model. Omitted properties are removed from the model:

- A value the user already typed is silently wiped. For example, an agent sends `{name: 'Bob'}` and `age: 25` disappears.
- The submission action receives an object that no longer matches the model's TypeScript type, so code such as `value().hobbies.join()` throws at runtime.

Reproduction (fails on `main`): a form over `{name: 'Alice', age: 25, address: {city: 'Sunnyvale', zip: 94089}, hobbies: ['reading']}` is called with `{name: 'Bob', address: {city: 'Paris'}}`.

    Expected object to have properties  age: 25, hobbies: ['reading']
    Expected $.address to have properties  zip: 94089

Issue Number: N/A

## What is the new behavior?

The agent's arguments are overlaid on top of the current form value instead of replacing it:

- Object properties missing from the arguments keep their current value, recursively.
- Arrays and primitives are still replaced as a whole, since an agent supplies the full list.
- The write is still a single `set`, so an agent can still change a field and the condition that governs it atomically.
- The merged object is built with `Object.fromEntries`, so a `__proto__` key in the agent's JSON stays an inert own property.

The inferred schema is unchanged, and so is the handling of hidden, disabled and readonly fields.

## Does this PR introduce a breaking change?

- [ ] Yes
- [x] No

`provideExperimentalWebMcpForms` is experimental and no API signature changes. The only behavior change is that omitted optional properties are kept instead of dropped, which is what the advertised schema already implies.

## Other information

**Roadmap alignment:** AI experience. WebMCP is how agents operate an Angular app, and this removes a data-loss path in the implicit form tool.

**Verification:**

- Added a regression test in `packages/forms/signals/test/web/webmcp.spec.ts`. Before the fix, `//packages/forms/signals/test/web:test_chromium` had 361 passed and 1 failed, with the output above.
- After the fix, `//packages/forms/signals/test/web:test_chromium` and `//packages/forms/signals/test/node:test` both pass, including all existing WebMCP tests.
- Not run: the Firefox target and suites outside `packages/forms/signals`.

**Scope / limitations:**

- Arrays are replaced whole, and schema inference from the first array element is unchanged.
- This does not take a position on whether agents should be able to write hidden, disabled or readonly fields (see the discussion in #70820).
- No docs change. `webmcp.md` does not describe how omitted properties are handled, so I left it alone. I'm happy to add a sentence if reviewers want one.
