Fixes #5756 

- escape the attribute values before passing into the `spread(...)`
- escape will make sure not to escape non string values, eg: `true`, `false`, `null`, ..., the `spread(...)` knows how to handle them

### Before submitting the PR, please make sure you do the following
- [ ] ~~It's really useful if your PR references an issue where it is discussed ahead of time. In many cases, features are absent for a reason. For large changes, please create an RFC: https://github.com/sveltejs/rfcs~~
- [x] This message body should clearly illustrate what problems it solves.
- [x] Ideally, include a test that fails without this PR but passes with it.

### Tests
-  [x] Run the tests with `npm test` and lint the project with `npm run lint`

