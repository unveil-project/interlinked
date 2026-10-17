When fields in a fetch share a response name but cannot be merged, the planner aliases one occurrence and emits a key rewrite renaming the alias back. `fields_in_set` adds no path element for an inline fragment without a type condition, so alias paths skip such fragments. But `with_field_aliased` only descends into a selection whose path element equals the alias path's next element, and an untyped fragment has none: aliases under it were silently dropped while their rewrites were still emitted.

Untyped fragments appear whenever a `@skip`/`@include` fragment is turned into a plan-level condition (e.g. `... on Query @include(if: $a) { ... }`), so planning such operations against fields needing aliases (e.g. two `@requires` inputs `f: Int!` and `f: Int`) failed with "Query planning produced an invalid subgraph operation". The search budget and type-conditioned fetching are unrelated to the failure.

Pass every alias at the current level into an untyped inline fragment, matching how `fields_in_set` computed their paths. Because fields inside and outside such a fragment then share a path, record the aliased field's name too and only alias the field with that name, so the non-conflicting sibling under the same response name is left alone.

### Reachability

Client-reachable: a valid operation like `query($a: Boolean!) { ... on Query @include(if: $a) { is { g } } }` against a supergraph with conflicting `@requires` inputs fails planning with "operation must not select different types using the same name". Independent of `max_evaluated_plans` (fails at every budget). Related to, but separate from, the alias-name fix in the "don't reuse a later client response name" PR; the two touch the end of `operation/tests/mod.rs`, so the second to land needs a trivial rebase.

### Testing

The regression test(s) in this PR fail on `dev` and pass with this change; neighboring test suites pass with no snapshot changes. Found during property-based testing of `apollo-federation`.

---

**Checklist**

- [x] PR description explains the motivation for the change and relevant context for reviewing
- [ ] PR description links appropriate GitHub/Jira tickets (creating when necessary)
- [x] Changeset is included for user-facing changes
- [x] Changes are compatible
- [ ] Documentation completed
- [ ] Performance impact assessed and acceptable
- [ ] Metrics and logs are added and documented
- Tests added and passing
    - [x] Unit tests
    - [ ] Integration tests
    - [ ] Manual tests, as necessary
