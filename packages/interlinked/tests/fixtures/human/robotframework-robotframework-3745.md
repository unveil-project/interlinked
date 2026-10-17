This change makes `Should Be Title` compatible with `Convert To Title`. Fixes #3651.

- Changes `should_be_titlecase` to `should_be_title_case`
- Updates `should_be_title_case` to use `convert_to_title_case` as an internal function to help determine if a string is in title case.
- Adds `exclude` argument to `should_be_title_case`
- Adds additional positive, exclude, and exclude regex tests for `should_be_title_case`. Re-used many of the `convert_to_title_case` tests to ensure compatibility
- Updates documentation for `should_be_title_case`

Please send over any feedback and anything I can do to improve the PR. Thanks!


