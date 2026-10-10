`InputObjectTypeDefinitionPosition::rename` only re-keyed the input object's reference record. Field arguments, input fields and directive arguments that take the input object kept the old, removed name, making the schema invalid. The reference index also kept the old name in the positions of the renamed input object's own fields.

The rename now rewrites the types of every referencing input value, preserving list and non-null wrappers, and `Referencers::rename_input_object_type` remaps the positions of the input object's fields. Rewriting input fields relies on the preceding fix to `InputObjectFieldDefinitionPosition::rename_type`.

**Stacked on #10379**, which it depends on; review only the top commit. Retarget to `dev` once that lands.

### Reachability

Internal API only. Renaming an input object skipped every argument, input field and directive argument using the type, leaving an invalid schema. Merge note: the schema rename PRs in this series each add the same referencer-rebuild check helper at the end of the `position.rs` test module, so whichever lands second needs a trivial rebase (keep the helper once).

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

