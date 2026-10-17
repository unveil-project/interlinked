Add a Dialog/Snackbar demo showing how to close the snackbar on the first Escape and the dialog on the next. Use the current `onClose` reason API and clear both states when the dialog closes.

Fixes #44799.

Verified the Escape sequence and focus restoration in Chrome. All 767 regression tests pass (5 existing skips), plus 109 Snackbar and 127 Dialog unit tests. Docs type checking, ESLint, formatting, and Vale error checks pass.

- [x] I have followed the [PR section of the contributing guide](https://github.com/mui/material-ui/blob/HEAD/CONTRIBUTING.md#sending-a-pull-request).
