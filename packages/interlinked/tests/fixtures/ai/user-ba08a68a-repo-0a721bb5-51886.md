# Why

`ExpoReactDelegate.createReactRootView` calls `createReactRootView` on every handler, even after one has already returned a root view. The sibling methods `bundleURL()` and `createRootViewController()` use `self.handlers.lazy`, so they stop at the first non-nil result. This one doesn't, because plain `compactMap` is eager.

That matters because `ExpoUpdatesReactDelegateHandler` and `ExpoDevLauncherReactDelegateHandler` both start a controller inside `createReactRootView`. With `expo-updates` active in a Debug build with the dev client, both can arm themselves and later both recreate a root view.

Fixes #51852

# How

Use `self.handlers.lazy` in `createReactRootView`, the same chain the sibling methods already use. `LazySequence.compactMap` followed by `first(where:)` only calls handlers until the first one returns a view. The fallback to `reactNativeFactory.recreateRootView` is unchanged.

I also added `ExpoReactDelegateTests.swift` with two Swift Testing cases:

- When the first handler returns a view, the second handler is never called and the factory fallback isn't used.
- When the first handler returns nil and the second returns a view, the third handler is never called.

Both would fail with the old eager `compactMap`.

# Test Plan

- I couldn't compile or run the Swift tests here, because this environment has no Xcode or Swift toolchain. The new test file follows the existing Swift Testing conventions in `packages/expo-modules-core/ios/Tests` (`#if os(iOS) || os(tvOS)`, `@MainActor`, `@Suite`). It still needs to run in the `ExpoModulesCore` iOS test target in CI.
- The production change is one line and matches `bundleURL()` and `createRootViewController()` in the same file.

# Checklist

- [x] I added a changeset and followed [this short guide](https://github.com/expo/expo/blob/main/CONTRIBUTING.md#-before-submitting)
- [ ] This diff will work correctly for `npx expo prebuild` & EAS Build (eg: updated a module plugin).
- [ ] Conforms with the [Documentation Writing Style Guide](https://github.com/expo/expo/blob/main/guides/Expo%20Documentation%20Writing%20Style%20Guide.md)
