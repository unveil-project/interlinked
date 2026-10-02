Checklist:

- [x] I have read and followed the [contribution guidelines](https://contribute.freecodecamp.org).
- [x] I have read and followed the [how to open a pull request guide](https://contribute.freecodecamp.org/how-to-open-a-pull-request/).
- [x] My pull request targets the `main` branch of freeCodeCamp.
- [x] I have tested these changes either locally on my machine, or GitHub Codespaces.

Closes #70561

## Summary

Clarifies the CSS Typography Quiz question about accessing external fonts so that `@import` is the only correct answer.

The previous wording could also reasonably include `@font-face`, which can load externally hosted font files.

### Testing

Tested the affected curriculum block in GitHub Codespaces:

`quiz-css-typography.test.js` — 3 tests passed.
