### CATEGORY

Choose one

- [x] Bug Fix
- [ ] Enhancement (new features, refinement)
- [ ] Refactor
- [ ] Add tests
- [ ] Build / Development Environment
- [ ] Documentation

### SUMMARY
<!--- Describe the change below, including rationale and design decisions -->
Resolves a bug introduced in https://github.com/apache/incubator-superset/pull/8213 where calling `get_extra_metadata` would result in a 5xx because of an uncaught exception. To fix, i've moved the query execute and all the polling inside the try/except block.

### TEST PLAN
<!--- What steps should be taken to verify the changes -->
select a presto table in sql lab, see the metadata (like latest partition) load successfully

### ADDITIONAL INFORMATION
<!--- Check any relevant boxes with "x" -->
<!--- HINT: Include "Fixes #nnn" if you are fixing an existing issue -->
- [ ] Has associated issue:
- [ ] Changes UI
- [ ] Requires DB Migration.
- [ ] Confirm DB Migration upgrade and downgrade tested.
- [ ] Introduces new feature or API
- [ ] Removes existing feature or API

### REVIEWERS
@betodealmeida @john-bodley @graceguo-supercat @villebro 