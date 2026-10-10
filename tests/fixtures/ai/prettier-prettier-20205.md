## Problem

Fixes #20173. Comments on a parenthesized JSX superclass (including `prettier-ignore`) were duplicated on every format.

## Root cause

Those comments were printed twice: once inside the parentheses by the JSX printer, and again outside them by the class printer. Each format added another copy.

## Fix

Keep comments that sit inside those parentheses on the JSX node so they print only there. Non-JSX superclasses such as `extends (/* c */ a())` are unchanged.

## Tests

- New fixture: `tests/format/jsx/class-superclass-comments/`
- `FULL_TEST=1` passed for the new fixture and nearby class/JSX comment suites (8 suites, 943 tests)

## Scope

- `src/language-js/comments/handle-comments.js`
- `src/language-js/print/class.js`
- `src/language-js/print/ignored.js`
- changelog entry under `changelog_unreleased/javascript/20173.md`