## Description
With `hx-swap="outerHTML show:top"` (or `show:bottom`), the swap target after an outerHTML swap is the first node of the new content. When the response starts with whitespace, that node is a text node, which has no `scrollIntoView`, so nothing scrolls.

This picks the first element of the new content instead, falling back to the first node (or the parent) like before when there isn't one. This is what was suggested in the issue.

Corresponding issue: Fixes #4114

## Testing
Added two tests in `test/tests/attributes/hx-swap.js` for `outerHTML show:top` and `show:bottom` with a response that starts with whitespace. Both fail without the change. `npm test` passes locally in Chromium (1782 passed, 4 skipped).

## Checklist

* [x] I have read the contribution guidelines
* [x] I have targeted this PR against the correct branch (`master` for website changes, `dev` for
  source changes)
* [x] This is either a bugfix, a documentation update, or a new feature that has been explicitly
  approved via an issue
* [x] I ran the test suite locally (`npm run test`) and verified that it succeeded
