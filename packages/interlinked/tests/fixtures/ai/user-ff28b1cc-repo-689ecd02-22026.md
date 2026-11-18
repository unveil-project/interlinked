### Summary

Contribution source: AI-assisted

Channel conversations repeat identity headers and wide spacing for consecutive short messages, while long previews interrupt scanning. Group adjacent messages from the same actor within five minutes, preserve identity at day/join/thread/reply boundaries, and tighten continuation spacing.

Long text now collapses to a 160 px preview with full expansion; attachments remain visible independently. Localized clocks and date separators make timing easier to follow, and continuation actions use a dedicated icon lane to avoid covering text. After integrating canary's quoted replies, compact rows provide labelled Reply and Start thread icons with space reserved for both actions, and retain quote navigation and highlighting.

Before/after screenshots are available in the [acceptance report](https://app.lobehub.com/acceptance/4ad0808b-0394-4bb8-9e5a-daf90d2f4d16) (CR-01 for grouping, CR-03 for long-text previews).

| Before | After |
| ------ | ----- |
| Repeated headers and spacing between consecutive messages | Compact continuations with identity restored at conversation boundaries |
| 269 px text preview in the comparison fixture | 160 px preview, expandable full text, and independently visible attachments |

#### Test

- [x] Tested locally
- [x] Added/updated tests
- `bun run check --lint --test --type` passed after rebasing onto canary, including 42 related page/channel tests and the repository type check.
- Fixed an existing page action test teardown race by mocking the Home store boundary and waiting for its background dynamic import after each test. The initial CI failure reported all 7,098 assertions passing but four `EnvironmentTeardownError` rejections.
- All three App CI shards passed on `e5f62cd1aa`. The previously failing third shard passed 761 test files and 7,116 tests with no unhandled teardown errors. [CI run](https://github.com/lobehub/lobehub/actions/runs/41218646095)
- Design lint reported zero failures and one existing typing-animation duration warning.
- Original desktop acceptance covers grouping, spacing, long-text expansion, attachments, and localized timestamps. Its report has been accepted, with touch mode (`hover: none`) still documented as unverified.
- Acceptance: https://app.lobehub.com/acceptance/4ad0808b-0394-4bb8-9e5a-daf90d2f4d16
- The post-rebase compatibility follow-up passed **2/2 checks** at 1024 × 768. It covers both compact toolbar actions without text overlap, correct reply/thread targets and identity, and quote navigation to the highlighted original message. All required screenshot/text evidence is uploaded.
- Compatibility acceptance: https://app.lobehub.com/lobehub/acceptance/c1068619-18cf-409e-a76a-099af4321116

#### ALint

The three `no-unguarded-response-field` errors in `ChannelMessage.tsx` are false positives, so no fallback was added:

- `detail` and `message` are props typed as the plain `ChannelDetail` / `ChannelPublicMessage` interfaces, and their values come from `useChannelStore`. The rule excludes both cases.
- `jobs`, `attachments` and `fileIds` shipped in #21545 together with `ChannelDetail` and the `channel.detail` endpoint. A server that lacks these fields also lacks the endpoint, so the request fails before any of these reads run.
- Lines 94 and 172 are existing reads that this PR only moved or reindented. Line 74 is new, but `FailureIndicator.tsx` and `store/channel/selectors.ts` already read `detail.jobs` without a fallback.

#### 🔗 Related Issue

None.


