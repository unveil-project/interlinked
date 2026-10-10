Original pull-request https://github.com/ClickHouse/ClickHouse/pull/122211

## Do not merge this PR manually

This pull-request is a first step of an automated backporting.
It contains changes similar to calling `git cherry-pick` locally.
If you intend to continue backporting the changes, then resolve all conflicts if any.
Otherwise, if you do not want to backport them, then just close this pull-request.

The check results does not matter at this step - you can safely ignore them.

### Before you resolve anything

Conflicts are often caused by a prerequisite change that has not been backported yet, rather than by a real divergence. The bot re-tries this cherry-pick against the release branch on every run, so if that is the case here it will merge itself as soon as the prerequisite lands, and you will see a comment saying so. Manual resolution is only needed while the conflict persists.

### Troubleshooting

#### If the conflicts were resolved in a wrong way

If this cherry-pick PR is completely screwed by a wrong conflicts resolution, and you want to recreate it:

- delete the `pr-cherrypick` label from the PR
- delete this branch from the repository

You also need to check the **Original pull-request** for `pr-backports-created` label, and  delete if it's presented there


### The PR source
The PR is created in the [CI job](https://github.com/ClickHouse/ClickHouse/actions/runs/36857804078/job/110362357962)