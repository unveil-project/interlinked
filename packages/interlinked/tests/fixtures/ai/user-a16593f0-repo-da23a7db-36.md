## Goal
Make reaching a selected Tasbih target clear to assistive-technology users.

## Scope
- Provide an accessible status update when the count reaches the selected target.
- Keep the existing count/status announcement concise and avoid announcing every unrelated UI change.
- Add a focused test for the target-reached state.

## Acceptance criteria
- The message reflects the selected dhikr and target.
- The counter can continue to increment after reaching the target.
- Existing vibration behavior remains optional.