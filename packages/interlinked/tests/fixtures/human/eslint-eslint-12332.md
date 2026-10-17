<!--
    ESLint adheres to the [JS Foundation Code of Conduct](https://js.foundation/community/code-of-conduct).
-->

**What is the purpose of this pull request? (put an "X" next to item)**

[ ] Documentation update
[ ] Bug fix ([template](https://raw.githubusercontent.com/eslint/eslint/master/templates/bug-report.md))
[ ] New rule ([template](https://raw.githubusercontent.com/eslint/eslint/master/templates/rule-proposal.md))
[ ] Changes an existing rule ([template](https://raw.githubusercontent.com/eslint/eslint/master/templates/rule-change-proposal.md))
[ ] Add autofixing to a rule
[ ] Add a CLI option
[ ] Add something to the core
[x] Other, please explain:

refs https://github.com/eslint/eslint/issues/11146

Finally have the time to switch to [`eslint-plugin-jsdoc`](https://github.com/gajus/eslint-plugin-jsdoc) in `eslint-config-eslint` now that our core JSDoc rules are deprecated!

<!--
    If the item you've checked above has a template, please paste the template questions below and answer them. (If this pull request is addressing an issue, you can just paste a link to the issue here instead.)
-->

<!--
    Please ensure your pull request is ready:

    - Read the pull request guide (https://eslint.org/docs/developer-guide/contributing/pull-requests)
    - Include tests for this change
    - Update documentation for this change (if appropriate)
-->

<!--
    The following is required for all pull requests:
-->

**What changes did you make? (Give an overview)**

This PR disables the deprecated `valid-jsdoc` and `require-jsdoc` core rules in favor of a series of (mostly) corresponding rules in `eslint-plugin-jsdoc`. This should probably be a major release of `eslint-config-eslint`, as the behavior isn't entirely the same and I've added a few extra rules (please let me know if this isn't desired).

New warnings:
- [check-alignment](https://github.com/gajus/eslint-plugin-jsdoc#eslint-plugin-jsdoc-rules-check-alignment)
- [check-tag-names](https://github.com/gajus/eslint-plugin-jsdoc#eslint-plugin-jsdoc-rules-check-tag-names)
- [implements-on-classes](https://github.com/gajus/eslint-plugin-jsdoc#eslint-plugin-jsdoc-rules-implements-on-classes)

It seems like these rules catch some `valid-jsdoc` false negatives and it's actually really nice that we can disable individual rules when we need to. I think it would also be nice to add the following rules in a future PR:
 - [newline-after-description](https://github.com/gajus/eslint-plugin-jsdoc#eslint-plugin-jsdoc-rules-newline-after-description)
 - [require-description](https://github.com/gajus/eslint-plugin-jsdoc#eslint-plugin-jsdoc-rules-require-description)
 - [require-hyphen-before-param-description](https://github.com/gajus/eslint-plugin-jsdoc#eslint-plugin-jsdoc-rules-require-hyphen-before-param-description)
 - [valid-types](https://github.com/gajus/eslint-plugin-jsdoc#eslint-plugin-jsdoc-rules-valid-types)

**Is there anything you'd like reviewers to focus on?**

I'd appreciate some eyes on the changes that I've made in the comments themselves. Will try to preemptively leave comments for the rationale for these changes.

