Fixes #29970

Previously, `KustomizeImage.Match` used `delim()` which split on the first colon, causing images with registry ports (e.g., `registry.example.com:5000/team/foo:1.0`) to be truncated to just the registry host (`registry.example.com`). As a result, `argocd app set` or `unset --kustomize-image` incorrectly matched and overwritten or deleted unrelated images sharing the same registry port, and digest overrides failed to replace existing tags. This fix compares the old image name prefix when `=` is present, and otherwise uses `kutil.SplitImageName` from `sigs.k8s.io/kustomize/api` to accurately extract the image name without tags, digests, or port truncation. Unit tests covering registry ports, tags, digests, and CLI unsetting have been added.

Checklist:

* [x] Either (a) I've created an enhancement proposal and discussed it with the community, (b) this is a bug fix, or (c) this does not need to be in the release notes.
* [x] The title of the PR states what changed and the related issues number (used for the release note).
* [x] The title of the PR conforms to the [Title of the PR](https://argo-cd.readthedocs.io/en/latest/developer-guide/submit-your-pr/#title-of-the-pr)
* [x] I've included "Closes [ISSUE #]" or "Fixes [ISSUE #]" in the description to automatically close the associated issue.
* [x] I've updated both the CLI and UI to expose my feature, or I plan to submit a second PR with them.
* [x] I have signed off all my commits as required by [DCO](https://github.com/argoproj/argoproj/blob/master/community/CONTRIBUTING.md#legal)
* [x] I have written unit and/or e2e tests for my change. PRs without these are unlikely to be merged.
* [x] My build is green.
* [x] I have added a brief description of why this PR is necessary and/or what this PR solves.


<!-- This is an auto-generated comment: release notes by coderabbit.ai -->
## Summary by CodeRabbit

* **Bug Fixes**
  * Improved Kustomize image matching when unsetting or updating images, including images with registry ports, distinct image paths, tags, or digests.
  * Unsetting an image by its repository-and-tag prefix now removes the matching image while retaining other images and correctly reports that an update was made.
  * Updating an image with a registry port now replaces only the matching image. Digest-form images also correctly match their tag-form counterparts.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->