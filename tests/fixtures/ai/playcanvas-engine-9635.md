Fixes hand and controller models freezing in place while the Quest system menu is open.

## Changes

- **Hide models while their pose is not tracked.** While a session is not fully visible, such as behind the system menu (`visible-blurred`), the browser sends no input poses. `XrControllers` kept drawing each model at its last pose, so on a Quest the hand models froze in place while the system drew the real hands over them. Hands that lost tracking froze the same way.
  - Each model is now hidden while its pose is not tracked: every model while the session is not visible, and hands while `XrHand#tracking` is false.
  - Controllers rely on the session check alone, as `XrInputSource#grip` stays true once a grip pose has been seen.
- **App visibility is preserved.** A model is only hidden or shown as its tracked state changes. When hidden, it remembers its entity's enabled state and gets that back when tracking resumes, so a model the app hid, for example from `xr:controller:add`, stays hidden. Setting `visible` while a model is hidden updates the state it returns to, rather than showing a frozen model. Otherwise `visible` keeps its existing behaviour of setting every model.

No public API changes, other than `tracked` and `enabledWhenTracked` on the entries of `XrControllers#controllers`.

## Testing

- `npm run lint` on the script and `npm run docs:scripts` pass. The `scripts/esm` scripts have no unit tests.
- Drove the script in a page with real model loads, fake input sources, and the session's visibility stubbed around each `update()`. Sources: A, a left controller the app hides from `xr:controller:add`; B, a right controller; H, a right hand.

| Step | A B H enabled |
|---|---|
| All tracked | false true true |
| Menu open (`visible-blurred`) | false false false |
| Menu closed | false true true (`true true true` before the second commit) |
| H loses tracking | false true false |
| H tracked again | false true true |
| `visible` set false then true with the menu open | false false false |
| Menu closed | true true true (`visible = true` sets every model, as before) |

- On a Quest 3 (Quest Browser 152) with hand tracking, opening and closing the system menu:
  - **Before:** the session went `visible-blurred`, frames kept running at about 72 fps, and both hands reported `tracking` false with unchanged wrist poses. The hand models stayed frozen where the menu opened.
  - **After the first commit:** both hand models were hidden in the frame the session went `visible-blurred` and shown again in the frame it returned to `visible`, which matched what was seen in the headset.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
