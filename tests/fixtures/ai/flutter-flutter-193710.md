Fixes #193706

Reparenting a subtree while it is blocked by a modal route can leave its cached semantics parent pointing outside its current render ancestry

Invalidate semantics parent data throughout a dropped render subtree so geometry updates wait until semantics traversal reaches it again

Keep this tied to structural changes in `dropChild` rather than detaching an entire view, preserving valid semantics state when a view moves

Add regression coverage for disabling a slider after closing a dialog on all target platform variants, and for reparenting a blocked subtree and restoring its semantics geometry

## Validation

Both regression scenarios reproduce the reported assertion without the fix, including all six slider platform variants

Local macOS validation using the repository SDK

- `bin/flutter test packages/flutter/test/rendering packages/flutter/test/semantics packages/flutter/test/widgets packages/flutter/test/material/slider_test.dart packages/flutter/test/material/range_slider_test.dart packages/flutter/test/material/dialog_test.dart --reporter expanded` — 8590 passed, 129 skipped before relocating the slider regression into the widgets semantics tests
- The final full rerun had 8559 passes and two TLS handshake failures while loading golden test resources
- `bin/flutter test packages/flutter/test/widgets/app_test.dart packages/flutter/test/widgets/widget_inspector_test.dart --reporter expanded` — both affected files passed on retry, 184 passed and 2 skipped
- `bin/flutter test packages/flutter/test/widgets/semantics_blocked_geometry_test.dart --reporter expanded` — all 10 tests passed after relocation
- `bin/flutter analyze --no-pub packages/flutter` — no issues
- `bin/dart format --output=none --set-exit-if-changed packages/flutter/lib/src/rendering/object.dart packages/flutter/test/widgets/semantics_blocked_geometry_test.dart` — no changes
- `git diff --check` — passed

The Linux target platform variant is covered by widget tests, not a native Linux desktop run

Draft pending contributor review of AI-assisted changes under the Flutter AI contribution guidelines

## Pre-launch Checklist

- [x] I read the [Contributor Guide] and followed the process outlined there for submitting PRs
- [x] I read the [Tree Hygiene] wiki page, which explains my responsibilities
- [x] I read and followed the [Flutter Style Guide], including [Features we expect every widget to implement]
- [x] I signed the [CLA]
- [x] I listed at least one issue that this PR fixes in the description above
- [x] I updated or added relevant documentation comments
- [x] I added new tests to check the change I am making, or this PR is [test-exempt]
- [x] I followed the [breaking change policy] and no public API changes are introduced

[Contributor Guide]: https://github.com/flutter/flutter/blob/main/docs/contributing/README.md
[Tree Hygiene]: https://github.com/flutter/flutter/blob/main/docs/contributing/Tree-hygiene.md
[Flutter Style Guide]: https://github.com/flutter/flutter/blob/main/docs/contributing/Style-guide-for-Flutter-repo.md
[Features we expect every widget to implement]: https://github.com/flutter/flutter/blob/main/docs/contributing/Style-guide-for-Flutter-repo.md#features-we-expect-every-widget-to-implement
[CLA]: https://cla.developers.google.com/
[test-exempt]: https://github.com/flutter/flutter/blob/main/docs/contributing/Tree-hygiene.md#tests
[breaking change policy]: https://github.com/flutter/flutter/blob/main/docs/contributing/Tree-hygiene.md#handling-breaking-changes
