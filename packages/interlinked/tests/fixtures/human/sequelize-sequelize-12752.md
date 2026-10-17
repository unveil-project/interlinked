Table names were not quoted in `getForeignKeysQuery` that was called by `queryInterface.describeTable` for the `sqlite` dialect.

I discovered this defect when I had a sqlite table named "Order" while working on `sequelize-auto`

This PR fixes it, using the same `quoteTable` function used elsewhere.

<!-- 
Thanks for wanting to fix something on Sequelize - we already love you!
Please fill in the template below.
If unsure about something, just do as best as you're able.

If your PR only contains changes to documentation, you may skip the template below.
-->

### Pull Request check-list

_Please make sure to review and check all of these items:_

- [x] Does `npm run test` or `npm run test-DIALECT` pass with this change (including linting)?
- [x] Does the description below contain a link to an existing issue (Closes #[issue]) or a description of the issue you are solving?
- [x] Have you added new tests to prevent regressions?
- (N/A) Is a documentation update included (if this change modifies existing APIs, or introduces new ones)?
- (N/A) Did you update the typescript typings accordingly (if applicable)?
- [x] Did you follow the commit message conventions explained in [CONTRIBUTING.md](https://github.com/sequelize/sequelize/blob/master/CONTRIBUTING.md)?

<!-- NOTE: these things are not required to open a PR and can be done afterwards / while the PR is open. -->

### Description of change

<!-- Please provide a description of the change here. -->
In **dialects/sqlite/query-generator.ts**, fix `getForeignKeysQuery` so that it quotes the table names in the same manner that is done in other methods.

Before:
```
Executing (default): PRAGMA foreign_key_list(Order)
```
After: 
```
Executing (default): PRAGMA foreign_key_list(`Order`)
```
