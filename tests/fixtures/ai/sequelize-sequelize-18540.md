## Pull Request Checklist

- [x] Have you added new tests to prevent regressions?
- [x] If a documentation update is necessary, have you opened a PR to [the documentation repository](https://github.com/sequelize/website/)? Not needed.
- [x] Did you update the typescript typings accordingly (if applicable)?
- [x] Does the description below contain a link to an existing issue (Closes #[issue]) or a description of the issue you are solving?
- [x] Does the name of your PR follow [our conventions](https://github.com/sequelize/sequelize/blob/main/CONTRIBUTING.md#6-commit-your-modifications)?

## Description of Changes

`queryInterface.changeColumn(table, column, { …, unique: true })` handled uniqueness by putting `UNIQUE` inline in the generated `ALTER` statement. The result depended on the dialect:
- **postgres, mysql, mariadb:** every call added another unique constraint or index, even when the column already had one (`name_key`, `name_key1`, …).
- **mssql, db2:** `ALTER COLUMN` can't add constraints, so `UNIQUE` was dropped silently (`supports.alterColumn.unique: false`) and the column stayed non-unique. Older versions generated invalid SQL instead.
- **oracle:** `unique` was ignored.

`changeColumn` no longer puts `UNIQUE` in the `ALTER` statement, on any dialect. After altering the column, it checks whether the table already has a unique key on exactly that column, or one with the requested name. It looks at unique constraints, unique indexes and the primary key, using both `showConstraints` and `showIndex`, because dialects differ in which of the two represents a unique key. Only if none exists does it add one, with `addConstraint({ type: 'UNIQUE' })`. The check and the new key use the `transaction` and `logging` options passed to `changeColumn`.

Dialect-specific behaviour:
- **db2:** rejects unique constraints on nullable columns, so a unique index is added for those columns instead.
- **sqlite3:** `changeColumn` rebuilds the table, then adds a unique index through the same check, because sqlite can't add constraints to an existing table.
- **Naming:** the name comes from `unique: 'name'`, `unique: { name }`, or the first named entry of an array. Without one, the default naming of `addConstraint` is used.
- **Scope:** only single-column unique keys are handled. Composite keys still come from `createTable` and indexes, and `unique: false` doesn't remove an existing key.

Also:
- `supports.alterColumn` is removed, since nothing else used it. So is the parsing of inline `ADD UNIQUE` in the postgres and snowflake `changeColumnQuery`.
- Fixes Db2's `addConstraint` retry for the "reorg pending" state (SQL0668N), which never fired because `ibm_db` reports the error code as `sqlstate`, not `state`.

Note: `sync({ alter: true })` was not affected on v7, because unique attributes are synced as indexes, and those already aren't duplicated. A regression test for #17978's sync scenario is included anyway.

Closes #9057
Closes #17978 (the root cause on v7. The issue was reported against v6, which would need a backport.)
Closes #8984

This also supersedes #18044, which skips the inline `UNIQUE` on postgres based on `model.uniqueKeys`. That only helps calls coming from `sync`, which on v7 never pass `unique` to `changeColumn` anyway. This PR checks the database instead, for every dialect and every caller.

Tests:
- 8 integration tests in `query-interface/changeColumn.test.js`:
  - duplicates are rejected, including together with `allowNull: false` (#9057);
  - repeated calls leave exactly one unique key (#17978);
  - existing unique indexes and keys, named keys and composite-name matches are respected;
  - the key survives a later change without `unique`.
- A `sync({ alter: true })` regression test.
- Unit tests for the new flow, with stubbed queries.

Verified locally:
- On db2 (12.1.5.0), mssql (2025), postgres, mysql, mariadb, sqlite3 and oracle: the changeColumn, sync, constraint, createTable and query-interface integration files pass. Wider runs (all `query-interface/**`, `model/**` and dialect-specific integration tests) pass on db2, mssql and postgres.
- Without the fix, the new tests fail on db2, mssql, postgres, mysql, mariadb and sqlite3.
- The core unit suite passes on all dialects. ibmi and snowflake are covered by unit tests only.

Known limitations, unchanged by this PR:
- Oracle ignores `unique: true` in `queryInterface.createTable` attribute options (one test allows for it with a TODO).
- MSSQL can't change a column's nullability while it has a unique constraint (Msg 5074).

## List of Breaking Changes

- `queryInterface.changeColumn` with `unique` no longer adds a unique key when the column already has one. On mssql, db2 and oracle it now actually adds one, where `unique` used to be ignored.
- `dialect.supports.alterColumn` was removed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


<!-- This is an auto-generated comment: release notes by coderabbit.ai -->

## Summary by CodeRabbit

* **Bug Fixes**
  * Changing a column to be unique now adds a single-column unique key only when an equivalent constraint or index doesn’t already exist, preventing duplicate keys during repeated schema changes.
  * Existing unique keys are retained when a later column change omits the `unique` option. For nullable Db2 columns, uniqueness is applied using an index.
* **Documentation**
  * Clarified how `changeColumn` handles unique keys, including named keys and the behavior of `unique: false`.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->