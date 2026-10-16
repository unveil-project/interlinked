Addressed the stale `stop()` review case in `b98ba72`.

What changed:
- `reserveRecording()` now returns a recording generation token.
- `releaseRecording()` only clears `recordingInProgress` when the token still matches the current recording.
- Added a regression test where `startRecording()` fails, the old `stop()` is called after a newer recording has reserved the mic, and the newer reservation remains intact.

Verification:
- `corepack yarn workspace @sourceacademy/bundle-sound test -- src/__tests__/recording.test.ts`
- `corepack yarn workspace @sourceacademy/bundle-sound tsc`
- `corepack yarn workspace @sourceacademy/bundle-sound lint`
- `git diff --check`
