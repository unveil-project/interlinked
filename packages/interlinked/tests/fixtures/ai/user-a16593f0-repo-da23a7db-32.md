## Goal
Make the 99 Names detail dialog easier to dismiss using a keyboard.

## Scope
- Add Escape-key handling while the detail dialog is open.
- Ensure the key handler does not interfere with unrelated dialogs or inputs.
- Add focused regression coverage for the close behavior.

## Acceptance criteria
- Escape closes the open detail dialog.
- The existing close button continues to work.
- Keyboard listeners are not duplicated after repeated open/close cycles.