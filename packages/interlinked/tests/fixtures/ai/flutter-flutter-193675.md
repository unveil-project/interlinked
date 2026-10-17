On Windows, a `VK_SHIFT` key message with the extended bit set or with a zero scan code makes Shift stay pressed in the framework indefinitely. This PR fixes that.

`KeyboardKeyEmbedderHandler::GetPhysicalKey` looks up `scancode | (extended ? 0xE000 : 0)` and falls back to `windowsPlane | scancode`, so such a message is recorded under a non-standard physical key (`0x1600000036`, `0x1600000000`) with a Shift logical key. After that:
- a regular key up resolves to the standard physical key, has no record, and is dropped;
- `SyncModifiersIfNeeded` (`MK_SHIFT` on `WM_MOUSEMOVE`) and `SynchronizeCriticalPressedStates` (`GetKeyState(VK_LSHIFT/VK_RSHIFT)`) only check the standard ShiftLeft/ShiftRight records, so they never release it;
- for a zero scan code, `ResolveKeyCode` also returns `MapVirtualKey(0, MAPVK_VSC_TO_VK_EX) == 0`.

User-visible effects: every click in a `SelectionArea`/`TextField` extends the selection, Tab moves focus backwards, and the mouse wheel scrolls horizontally.

The fix rewrites Shift key messages in `KeyboardManager::HandleMessage` to the standard ShiftLeft (`0x2a`) or ShiftRight (`0x36`) scan code with the extended bit cleared, before anything else reads them. Messages that already have a standard scan code are left unchanged. If a zero scan code is mapped to the wrong side, the existing `GetKeyState` synchronization corrects the state on the next key event.

Testing:
- New tests `ShiftRightWithExtendedBitIsReleasedByRegularKeyUp` and `ShiftWithZeroScanCodeIsReleasedByRegularKeyUp` in `keyboard_unittests.cc`.
- The same transformation, applied in an app runner as a window subclass in front of the engine, was checked against 3.47.2 with real messages. Without it, `PostMessage` of an extended/zero-scancode Shift down followed by a regular up and a mouse move leaves `HardwareKeyboard.isShiftPressed == true`. With it, Shift is released. Real `SendInput` input (left/right Shift, Shift + gray arrows, Shift + numpad with NumLock, injected scancode 0 / extended) behaves the same with and without it. Repro details: https://github.com/flutter/flutter/issues/181907#issuecomment-5939704745

Fixes https://github.com/flutter/flutter/issues/181907

## Pre-launch Checklist

- [x] I read the [Contributor Guide] and followed the process outlined there for submitting PRs.
- [x] I read the [AI contribution guidelines] and understand my responsibilities, or I am not using AI tools.
- [x] I read the [Tree Hygiene] wiki page, which explains my responsibilities.
- [x] I read and followed the [Flutter Style Guide], including [Features we expect every widget to implement].
- [x] I signed the [CLA].
- [x] I listed at least one issue that this PR fixes in the description above.
- [x] I updated/added relevant in-code documentation (doc comments with `///`).
- [x] If this PR introduces a new feature or capability, I created and linked a website documentation issue or PR in [flutter/website] (or verified none is needed).
- [x] I added new tests to check the change I am making, or this PR is [test-exempt].
- [x] I followed the [breaking change policy] and added [Data Driven Fixes] where supported.
- [x] All existing and new tests are passing.

<!-- Links -->
[Contributor Guide]: https://github.com/flutter/flutter/blob/main/docs/contributing/Tree-hygiene.md#overview
[AI contribution guidelines]: https://github.com/flutter/flutter/blob/main/docs/contributing/Tree-hygiene.md#ai-contribution-guidelines
[Tree Hygiene]: https://github.com/flutter/flutter/blob/main/docs/contributing/Tree-hygiene.md
[test-exempt]: https://github.com/flutter/flutter/blob/main/docs/contributing/Tree-hygiene.md#tests
[Flutter Style Guide]: https://github.com/flutter/flutter/blob/main/docs/contributing/Style-guide-for-Flutter-repo.md
[Features we expect every widget to implement]: https://github.com/flutter/flutter/blob/main/docs/contributing/Style-guide-for-Flutter-repo.md#features-we-expect-every-widget-to-implement
[CLA]: https://cla.developers.google.com/
[flutter/tests]: https://github.com/flutter/tests
[flutter/website]: https://github.com/flutter/website
[breaking change policy]: https://github.com/flutter/flutter/blob/main/docs/contributing/Tree-hygiene.md#handling-breaking-changes
[Discord]: https://github.com/flutter/flutter/blob/main/docs/contributing/Chat.md
[Data Driven Fixes]: https://github.com/flutter/flutter/blob/main/docs/contributing/Data-driven-Fixes.md
