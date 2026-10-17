## The situation

You have a session listed by `zellij ls` as `EXITED - attach to resurrect`. You run `zellij attach <name>` to get back to your work. Instead of your session, you get `Bye from Zellij!` and you're back at your shell a moment later. The session is still listed. Attaching again does the same thing.

The cause is that the serialized layout for that session contains no terminal panes. A layout made up purely of plugins — a tab bar and a status bar, for instance — gives you nothing to type into, so there is no way to interact with the session once it comes up. The client connects, finds nothing it can drive, and disconnects.

This can happen if a session was serialized in that state, which is not something you have to go looking for on purpose.

## What this PR changes

Before handing a resurrected layout to the client, we check whether it would actually produce a terminal pane. If it would not, we print a warning that says what the problem is and how to get out of it:

```
WARNING: the layout serialized for session "repro" contains no terminal panes, so there is nothing to attach to.
To free up this session name, run: zellij delete-session repro
```

The session still ends up exiting the way it does today — this does not change that behaviour, it only explains it. The `delete-session` hint is the way to release the session name so it can be used again.

@ErichDonGubler came up with the `delete-session repro` workaround in https://github.com/zellij-org/zellij/issues/5672#issuecomment-5917446903, and suggested pointing users at it with some warning output. This is that suggestion implemented: the warning names the cause and hands over the workaround he found.

The check itself lives on the layout types, next to the existing pane-counting helpers:

- `TiledPaneLayout::has_terminal_panes` — walks the tree and reports whether any leaf pane runs a terminal rather than a plugin
- `FloatingPaneLayout::is_terminal_pane` — the same question for a floating pane
- `Layout::has_terminal_panes` — covers every tab and the template section

No attach, layout, or session behaviour changes for layouts that do have terminal panes, which includes all of the built-in layouts.

## Testing

Unit tests in `zellij-utils/src/input/unit/layout_test.rs` cover the plugin-only tab from the issue reproduction, a plugin-only floating layer, plugin-only nested splits, and the positive cases (a bare pane, a plugin pane alongside a terminal pane, a terminal floating pane). There's also a check that the built-in layouts are all correctly identified as having terminal panes, so the warning can't fire on a normal session.

`cargo test -p zellij-utils --lib` passes.
