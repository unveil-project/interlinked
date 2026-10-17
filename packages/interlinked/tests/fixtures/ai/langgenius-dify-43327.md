## Summary

Clicking the Agent prompt copy control closed its tooltip before users could read the copied confirmation. Set `closeOnClick={false}` on this action’s TooltipTrigger so the existing copied feedback remains visible while hovered. Pointer-leave dismissal and the two-second clipboard feedback state remain unchanged.

Fixes #43326

## Validation

- Existing prompt-editor suite: 33 tests passed.
- Added a feature-owner regression using the real tooltip and clipboard hook: hover, copy, visible copied feedback, exact clipboard content, and dismissal on pointer leave.
- Removing the fix makes the copied-feedback assertion fail; restoring it passes.
- `vp run -w check`, staged checks, and `git diff --check` passed.

The production change is one prop on the copy control. No shared primitive, styling, or Menu changes are included. Tests run in happy-dom; no live-page browser validation is claimed.

From Codex
