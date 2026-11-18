## Goal
Reduce accidental loss of a user's saved preferences when they choose to reset local settings.

## Scope
- Review the existing reset-settings control and its current confirmation behavior.
- Add a clear confirmation step only if one is missing.
- Keep the confirmation keyboard accessible and test the decision path.

## Acceptance criteria
- Cancel leaves settings unchanged.
- Confirm resets the documented local settings.
- The change does not clear unrelated browser data.