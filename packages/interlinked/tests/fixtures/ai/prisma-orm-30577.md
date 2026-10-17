## Linked issue

n/a — no Linear ticket; first of two PRs for cross-namespace inheritance. The follow-up PR changes `variants` to a value-keyed form with namespace-qualified references and adds cross-namespace MTI.

## At a glance

```ts
export class TaskCollection extends Collection<Contract, 'Task'> {
  bugs() {
    return this.variant('bug');
  }

  features() {
    return this.variant('feature');
  }
}
```

From [`examples/prisma-8-demo/src/orm-client/collections.ts`](examples/prisma-8-demo/src/orm-client/collections.ts), where `Bug` declares `@@base(Task, "bug")`. Before this PR the call was `this.variant('Bug')`, and a name the model did not declare returned the collection unchanged, so the query read every variant.

## Summary

`variant()` in the SQL and Mongo ORMs now selects a variant by its declared discriminator value instead of its model name. A discriminator value identifies one variant even when variants in different namespaces share a model name, which the follow-up cross-namespace PR depends on. Changing the public API here lets that PR change the contract's `variants` representation without touching `variant()` again.

## Decision

This PR ships:

1. **Value selection in both ORMs.** `variant(value)` accepts only the receiver's declared discriminator values. Model names, undeclared values and calls on a model without a discriminator are rejected by the type checker and throw `ORM.ARGUMENT_INVALID` at runtime with meta `{ method, argument, model, value, declaredValues }`. This replaces the old silent no-op.
2. **Mongo filter replacement.** A second `variant()` call in Mongo replaces the previous discriminator filter instead of appending another one, matching SQL.
3. **Unique discriminator values.** Duplicate values within one hierarchy are rejected by framework domain validation, Mongo PSL (`PSL_DUPLICATE_DISCRIMINATOR_VALUE`) and the Mongo TS builder (`CONTRACT.ARGUMENT_INVALID`). SQL PSL already rejected them; the SQL TS builder has no variants authoring surface.
4. **Migration.** Call sites in integration tests and four examples, the reference docs, the error reference, the `skills/prisma-8` query references and a pending upgrade fragment.

The contract representation, `contract.json` and `contract.d.ts` do not change.

## Notes for the reviewer

- **Breaking change.** Every `variant('<ModelName>')` call must change. A model-name argument still type-checks when it happens to equal a declared value (e.g. `@@base(Base, "Admin")` on a model named `Admin`) and then selects that variant. Every fixture's values differ from its model names, and the upgrade fragment tells the agent to check each call against the contract rather than rely on type errors.
- **Mongo read types still do not narrow.** After `variant()`, Mongo narrows create inputs only. Read results, `where()`, `select()` and include keys stay typed against the base model. This was already the case before this PR and is deliberately left for a follow-up; SQL narrows all of them.
- **Re-selection drops a user-written discriminator equality.** Replacing the previous variant filter also removes a user-written `$eq` on the discriminator field. This is existing SQL behaviour, now matched in Mongo.
- **The `as never` in the composite-PK integration test stays**, because `readTrucks` is untyped ([`composite-primary-key-mutations.test.ts`](test/integration/test/sql-orm-client/composite-primary-key-mutations.test.ts)).
- **Upgrade fragment validation.** Only the app half was validated, by applying it to the base-state examples. The extension half cannot be checked that way, because the ORMs themselves live under `packages/3-extensions/`.
- The remaining `variant('Bug')` calls in the branch are the negative type tests, plus `docs/releases/v0.15.0.md` and the released 0.14-to-0.15 guide, which are historical and left as written.

## How it fits together

1. **Make a value identify one variant.** Domain validation rejects a base whose `variants` repeat a `value`, and both Mongo authoring surfaces report the same conflict with a message naming both variants ([`validate-domain.ts`](packages/1-framework/0-foundation/contract/src/validate-domain.ts), [Mongo PSL `interpreter.ts`](packages/2-mongo-family/2-authoring/contract-psl/src/interpreter.ts), [Mongo `contract-builder.ts`](packages/2-mongo-family/2-authoring/contract-ts/src/contract-builder.ts)). This also makes SQL's `variantsByValue` map unambiguous; it used to keep the last entry on a duplicate.
2. **Type the parameter by value.** Each ORM adds `VariantValues` (the union of the receiver's declared values, `never` without variants) and `VariantNameForValue` (value back to variant model name). Everything downstream of `variant()` (row, relation, include and create-input types, and the collection's variant state) still uses the model name, so those types are unchanged ([SQL `types.ts`](packages/3-extensions/sql-orm-client/src/types.ts), [Mongo `types.ts`](packages/2-mongo-family/5-query-builders/orm/src/types.ts)).
3. **Resolve the value at runtime.** SQL looks the value up in `variantsByValue`; Mongo finds the matching variant entry. Both throw on a miss and keep storing the variant model name in internal state, so MTI joins, write discriminator injection and variant field lookup are untouched ([SQL `collection.ts`](packages/3-extensions/sql-orm-client/src/collection.ts), [Mongo `collection.ts`](packages/2-mongo-family/5-query-builders/orm/src/collection.ts)).
4. **Migrate consumers.** Call sites, JSDoc, docs, skill references and the upgrade fragment under `upgrade-instructions/pending/variant-takes-discriminator-value/` (app and extension audiences; detection matches every `.variant(` call, including ones with variable arguments).

## Behavior changes & evidence

- **SQL `variant()` takes a declared discriminator value; anything else is a type error and throws `ORM.ARGUMENT_INVALID`.** Implementation: [`sql-orm-client/src/collection.ts`](packages/3-extensions/sql-orm-client/src/collection.ts), [`sql-orm-client/src/types.ts`](packages/3-extensions/sql-orm-client/src/types.ts). Evidence: [`polymorphism.test-d.ts`](packages/3-extensions/sql-orm-client/test/polymorphism.test-d.ts), [`collection-variant.test.ts`](packages/3-extensions/sql-orm-client/test/collection-variant.test.ts).
- **Mongo `variant()` has the same contract, and create inputs narrow to the selected variant.** Implementation: [`orm/src/collection.ts`](packages/2-mongo-family/5-query-builders/orm/src/collection.ts), [`orm/src/types.ts`](packages/2-mongo-family/5-query-builders/orm/src/types.ts), [`orm/src/orm-errors.ts`](packages/2-mongo-family/5-query-builders/orm/src/orm-errors.ts). Evidence: [`orm-types.test-d.ts`](packages/2-mongo-family/5-query-builders/orm/test/orm-types.test-d.ts), [`mongo.types.test-d.ts`](packages/3-extensions/mongo/test/mongo.types.test-d.ts).
- **Chained Mongo `variant()` calls replace the discriminator filter; other filters are kept.** Implementation: [`orm/src/collection.ts`](packages/2-mongo-family/5-query-builders/orm/src/collection.ts). Evidence: [`orm/test/collection.test.ts`](packages/2-mongo-family/5-query-builders/orm/test/collection.test.ts).
- **Contracts with a duplicate discriminator value in one hierarchy are rejected.** Implementation: [`validate-domain.ts`](packages/1-framework/0-foundation/contract/src/validate-domain.ts), [Mongo PSL `interpreter.ts`](packages/2-mongo-family/2-authoring/contract-psl/src/interpreter.ts), [Mongo `contract-builder.ts`](packages/2-mongo-family/2-authoring/contract-ts/src/contract-builder.ts). Evidence: [`validate-domain.test.ts`](packages/1-framework/0-foundation/contract/test/validate-domain.test.ts), [`interpreter.polymorphism.test.ts`](packages/2-mongo-family/2-authoring/contract-psl/test/interpreter.polymorphism.test.ts), [`contract-builder.polymorphism.test.ts`](packages/2-mongo-family/2-authoring/contract-ts/test/contract-builder.polymorphism.test.ts).
- **Docs describe value selection and the new error cases.** [`model-and-result-types.md`](docs/reference/model-and-result-types.md), [`error-reference.md`](docs/reference/error-reference.md), [`upgrade-instructions/pending/variant-takes-discriminator-value/app/instructions.md`](upgrade-instructions/pending/variant-takes-discriminator-value/app/instructions.md).

## Testing performed

- Package tests: `contract` 223, Mongo `contract-psl` 263, Mongo `contract-ts` 131, `sql-orm-client` 1004, Mongo ORM 275, `extensions/mongo` 150.
- Examples: `prisma-8-demo` 85, `mongo-demo` 35, `mongo-blog-leaderboard` 2, `retail-store` 55.
- `pnpm lint:deps` and `check:upgrade-coverage` pass.
- Root `pnpm typecheck` passes 170/171.
- Local environment failures, to be confirmed by CI: the `prisma7-adoption` typecheck fails because the Prisma 7 engine download returns 404 on NixOS; the packaging tarball tests fail with `ERR_PNPM_TRUST_DOWNGRADE`; `contract-imports` fails because it treats a pnpm warning on stderr as a failure. None of them touch `variant()`.

## Skill update

Updated the canonical [`skills/prisma-8/references/queries.md`](skills/prisma-8/references/queries.md) and [`skills/prisma-8/references/queries-mongo.md`](skills/prisma-8/references/queries-mongo.md) to call `variant()` with a discriminator value.

## Follow-ups

- Cross-namespace inheritance: value-keyed `variants` with namespace-qualified references, and cross-namespace MTI.
- Mongo `variant()` narrowing of read results, `where()`, `select()` and includes, plus runtime lookup of variant-declared relations in `include()`.

## Alternatives considered

- **Keep selecting by model name.** Once variants can live in different namespaces, two variants of one base can share a model name, so a name no longer identifies one variant. A discriminator value is unique within a hierarchy and is what the query filters on anyway.
- **Keep the silent no-op for unknown values.** It returned an unfiltered collection, so a typo or a stale model name read every variant without any signal. Throwing with the declared values makes the mistake visible.
- **Store the selected value instead of the model name in collection state.** That would have meant changing MTI joins, write discriminator injection and variant field lookup. Resolving the value once in `variant()` keeps those paths unchanged.
- **Ship SQL and Mongo in separate PRs.** That would leave the two ORMs with different `variant()` contracts between merges.

## Checklist

- [x] All commits are signed off (`git commit -s`) per the [DCO](../CONTRIBUTING.md#developer-certificate-of-origin-dco). The DCO status check will block merge if any commit is missing a `Signed-off-by:` trailer.
- [x] I read [CONTRIBUTING.md](../CONTRIBUTING.md) and the change is scoped to one logical concern.
- [x] Tests are updated (or `n/a` if the change is doc-only / refactor with no behavioural delta).
- [ ] The PR title is in `TML-NNNN: <sentence-case title>` form (Linear ticket prefix + concise title naming the concrete deliverable). See `.claude/skills/create-pr/SKILL.md` for the full convention.
  - No Linear ticket exists for this work, so the title has no `TML-` prefix.
- [x] The **Skill update** section above is filled in (or stated `n/a — internal only`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)


<!-- This is an auto-generated comment: release notes by coderabbit.ai -->

## Summary by CodeRabbit

* **Behavior Changes**
  * `.variant()` now takes the discriminator value declared for a variant, rather than its model name. This applies to Mongo and SQL ORM collections.
  * Calls with an undeclared value, or on a model without discriminator values, now raise an argument error instead of returning the collection unchanged.
* **Validation**
  * Duplicate discriminator values within a model are now reported as errors.
* **Documentation**
  * Updated examples and upgrade guidance to show the required discriminator values.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->
