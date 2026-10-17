## Summary

Preserve typed-array bytes when `toFormData` converts values to Node Buffers. `Buffer.from(typedArray)` converts elements to bytes instead of copying their binary representation: a two-element `Uint16Array` becomes two bytes instead of four, and a `BigInt64Array` throws. The Blob path already preserves the bytes.

The Buffer path now uses a byte view bounded by the original array's offset and length. Regression tests compare Uint16Array, Float32Array, and BigInt64Array subviews with native Blob serialization.

## Validation

All three new cases fail before the fix. Afterward, all 52 tests in the toFormData, formDataToStream, and formDataToJSON suites pass. ESLint, Prettier, and `git diff --check` pass.

- [x] Tests added
- [x] No public API/type changes; included an unreleased changelog entry
- [x] No intentional breaking changes

:surfer:


<!-- This is an auto-generated description by cubic. -->
---
## Summary by cubic
## Description

Fixes `toFormData` in Node so typed arrays preserve their raw bytes during Buffer conversion. Before, `Buffer.from(typedArray)` converted elements to bytes instead of copying their binary representation: a two-element `Uint16Array` became two bytes instead of four, and a `BigInt64Array` threw. The Blob path already preserved bytes correctly.

The Buffer path now converts from a `Uint8Array` view of the typed array's underlying buffer, bounded by the original offset and length. No public API or type changes; the fix includes an unreleased changelog entry.

## Docs

No documentation changes are needed — this is a bug fix with no public API changes.

## Testing

Added regression tests comparing `Uint16Array`, `Float32Array`, and `BigInt64Array` subviews against native Blob serialization. All three cases failed before the fix; after, all 52 tests in the toFormData, formDataToStream, and formDataToJSON suites pass.

## Semantic version impact

Patch. Bug fix with no intentional breaking changes or public API changes.

<sup>Written for commit 0095f2beadab20d814c37df050ed7f9a515dc615. Summary will update on new commits.</sup>

<a href="https://cubic.dev/pr/axios/axios/pull/11264?utm_source=github" target="_blank" rel="noopener noreferrer" data-no-image-dialog="true"><picture><source media="(prefers-color-scheme: dark)" srcset="https://www.cubic.dev/buttons/review-in-cubic-dark.svg"><source media="(prefers-color-scheme: light)" srcset="https://www.cubic.dev/buttons/review-in-cubic-light.svg"><img alt="Review in cubic" src="https://www.cubic.dev/buttons/review-in-cubic-dark.svg"></picture></a>

<!-- End of auto-generated description by cubic. -->

