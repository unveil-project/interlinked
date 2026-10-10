# Description

`createFacetValue` and `createFacetValues` call `FacetService.findOne` without relations, which loads and translates every existing value of the facet. `FacetValueService.create` only needs the facet to set `fv.facet`, so both resolvers now request `['channels']` (kept because the facet carried it before) and creation no longer scales with the facet size.

Timing `createFacetValue` on sqljs against a facet with N existing values: 475 ms at 1,500 values and 1.8 s at 3,000 before the change, about 5 ms at 3,000 after. The test in `facet.e2e-spec.ts` spies on `FacetService.findOne` and checks neither mutation requests `values`; it fails without the change. `FacetService.findAll` and the `facet { values }` field still load all values.

Fixes #5497

# Breaking changes

None. The facet passed to `FacetValueService.create`, and so `event.entity.facet` on the resulting `FacetValueEvent`, no longer has `values` populated.

# Screenshots

N/A

# Checklist

📌 Always:
- [x] I have set a clear title
- [x] My PR is small and contains a single feature
- [x] I have [checked my own PR](## "Fix typo's and remove unused or commented out code")

👍 Most of the time:
- [x] I have added or updated test cases
- [ ] I have updated the README if needed

<!-- codesmith:footer -->
---
<a href="https://app.blacksmith.sh/vendurehq/codesmith/vendure/pr/5506?autoLogin=true&ref=codesmith_pr_footer"><picture><source media="(prefers-color-scheme: dark)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/view-with-codesmith-dark-v3.svg"><source media="(prefers-color-scheme: light)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/view-with-codesmith-light-v3.svg"><img alt="View with [code]smith" src="https://pr-comments-assets.blacksmith.sh/codesmith/view-with-codesmith-dark-v3.svg"></picture></a> <a href="https://backend.blacksmith.sh/track/enable-autofix?expires=1794086677&installation_model_id=20193&pr_number=5506&ref=codesmith_pr_footer&repository=vendurehq%2Fvendure&return_to=https%3A%2F%2Fgithub.com%2Fvendurehq%2Fvendure%2Fpull%2F5506&signature=2dc81436a360bd781e103abf03f0c53c88c1db65721200ba383fb0b0738325eb"><picture><source media="(prefers-color-scheme: dark)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/autofix-with-codesmith-dark.svg"><source media="(prefers-color-scheme: light)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/autofix-with-codesmith-light.svg"><img alt="Autofix with [code]smith" src="https://pr-comments-assets.blacksmith.sh/codesmith/autofix-with-codesmith-dark.svg"></picture></a>
<sup>Need help on this PR? Tag <code>@codesmith-bot</code> with what you need. Autofix is disabled.</sup>

<!-- codesmith:autofix:disabled -->
<!-- /codesmith:footer -->