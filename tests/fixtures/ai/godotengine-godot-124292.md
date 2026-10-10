## Description

Adds a **Copy All** button to the **Errors** tab of the Debugger panel, placed to the left of **Clear**.

Until now, the only way to get the error list out of the editor was to right-click a single entry and use **Copy Error** - one entry at a time. That is inconvenient when filing an issue or pasting a batch of runtime errors somewhere else.

The new button copies every error and warning currently listed, including their detail rows (C++ error, C++ source and stack trace), using exactly the same layout as the existing **Copy Error** entry. That entry is now implemented through the same helper, so the two cannot drift apart.

The button is disabled while the list is empty, like the neighbouring **Expand All** / **Collapse All** / **Clear** buttons.

## Notes

- No class reference change: this only adds an editor UI control.

## Tested

Built on Windows (editor, `4.8.dev.custom_build`, `dev_build=yes tests=yes`) and drove the editor against a project that raises three runtime errors from the debugged game (call on a null instance, out-of-bounds array access, missing dictionary key):

- the button is created in the Errors tab and starts disabled;
- it becomes enabled as soon as the debugger receives the first error, and is disabled again by **Clear**;
- pressing it while the list is empty is a no-op and does not crash.

The copied text is produced by `_get_error_item_as_text()`, which is the exact code path already used by **Copy Error**, so the layout of a single entry is unchanged.
