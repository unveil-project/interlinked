Adds the `include` configuration option and `changeset version --include`. Packages outside the selection use the existing `ignore` handling: mixed changesets are rejected as a whole, and excluded changesets remain pending. Configuration supports the existing glob patterns, and conflicting selectors report errors.

Closes #1672.

Validation: regression coverage for selection, mixed changesets, dependency updates, fixed/linked groups and prereleases; 868 unit tests passed (2 existing todos), plus build, type checking, lint and formatting. The separate E2E suite was not run.
