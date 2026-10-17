## Summary

- make the function branch of `VNodeRef` bivariant so callbacks can use specific DOM element types such as `HTMLFormElement | null`
- preserve type errors for callbacks with unrelated parameter types
- add DTS regression coverage for both cases

## Motivation

`VNodeRef` currently fixes the callback parameter to `Element | ComponentPublicInstance | null`. Under strict function parameter checking, a valid element-specific callback is rejected because its parameter is narrower than `Element`. The bivariant callback keeps the public ref value constrained while allowing callbacks that match a concrete template element.

## Validation

- `pnpm test-dts`
- `pnpm check`
- `pnpm lint`
- `pnpm format-check`
- `git diff --check`

Fixes #13969.

<!-- This is an auto-generated comment: release notes by coderabbit.ai -->

## Summary by CodeRabbit

* **Bug Fixes**
  * Improved TypeScript checking for element refs. Callbacks that accept a form element or `null` are now accepted for forms, while callbacks with incompatible parameter types, such as `string`, are rejected.
  * Ref callback types now allow compatible callback parameter variations without changing the callback arguments or return type.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->
