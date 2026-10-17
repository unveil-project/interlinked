Refresh all maintained dependency ecosystems with a fixed publication cutoff of **2026-10-07T02:36:46Z** (seven days before the refresh began), not only the root npm manifest.

Cover workspace and standalone npm packages/locks, Cargo, SwiftPM, Ruby, Gradle, CI actions/tools, and pinned container images. Preserve existing newer pins rather than downgrade, carry existing reviewed patches without expanding their semantics, and document concrete upstream compatibility or artifact-verification holds.

The change should qualify dependency API migrations and cross-project test-cache behavior with focused local proof, then use PR CI for broad integration. It must not change supported runtime floors, publish a release, or deploy/restart running services.
