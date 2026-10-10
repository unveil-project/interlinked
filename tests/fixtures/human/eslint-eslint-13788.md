The ``space-before-function-paren`` rule should treat private class methods as named, instead of anonymous.

* **ESLint Version:** 7.11.0
* **Node Version:** v15.0.0
* **npm Version:** 7.0.2

Code Snippet:

```javascript
// ...
class Test {
    // ...
    static #method() {
    }
    // ...
}
```

Config snippet:
```json
...
        "space-before-function-paren": [
            "error",
            {
                "anonymous": "always",
                "named": "never",
                "asyncArrow": "always"
            }
        ]
...
```

Expected no error. Actual result is:

```
  17:37  error    Missing space before function parentheses        space-before-function-paren
```

<!--
    Thank you for contributing!

    ESLint adheres to the [JS Foundation Code of Conduct](https://js.foundation/community/code-of-conduct).
-->

#### Prerequisites checklist

- [X] I have read the [contributing guidelines](https://github.com/eslint/eslint/blob/master/CONTRIBUTING.md).

#### What is the purpose of this pull request? (put an "X" next to an item)

- [ ] Documentation update
- [X] Bug fix ([template](https://raw.githubusercontent.com/eslint/eslint/master/templates/bug-report.md))
- [ ] New rule ([template](https://raw.githubusercontent.com/eslint/eslint/master/templates/rule-proposal.md))
- [ ] Changes an existing rule ([template](https://raw.githubusercontent.com/eslint/eslint/master/templates/rule-change-proposal.md))
- [ ] Add autofixing to a rule
- [ ] Add a CLI option
- [X] Add something to the core
- [ ] Other, please explain:

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

#### What changes did you make? (Give an overview)

Added ``ClassPrivateMethod`` alongside ``MethodDefinition`` for a definition of named method within class body.

#### Is there anything you'd like reviewers to focus on?

Unit test for this covering this kind of class definitions is missing. While previous syntax is not affected by this change, unit test should be added to ensure the rule works as expected in the new ES2020 syntax.
