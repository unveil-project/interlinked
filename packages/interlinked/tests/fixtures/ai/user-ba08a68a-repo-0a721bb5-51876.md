# Why

`NativeTabs.Trigger` with `role="search"` is a normal tab on iOS 27. It is not the separate search tab.

Expo Router forwards `role` only as `ios.systemItem`. That builds a legacy `UITabBarItem`. The iOS 27 SDK draws that item as a normal tab. `react-native-screens` already supports `ios.role: "search"` and `ios.automaticallyActivatesSearch`. Expo Router never sets them.

Fixes https://github.com/expo/expo/issues/51506

# How

Forwarding `role` as `ios.role` alone does not restore the separate tab on iOS 27. UIKit detaches that tab only while search activation is enabled.

This change forwards `role="search"` as both `ios.role` and `ios.systemItem`. `ios.systemItem` keeps the system icon and title. Other roles stay on `ios.systemItem` only, because `ios.role` accepts `"search"` alone. When `role` is `"search"` and `automaticallyActivatesSearch` is omitted, Expo Router enables search activation. Set `automaticallyActivatesSearch={false}` to leave the field inactive. On iOS 27, that also removes the separate placement.

`unstable_nativeProps.ios` still overrides search activation. The extra props are read during the existing render. There is no extra native work.

# Test Plan

- `pnpm exec jest src/native-tabs/__tests__/options.e2e.test.ios.tsx src/native-tabs/__tests__/NativeTabsView.test.ios.tsx src/native-tabs/__tests__/options.test.ios.tsx --selectProjects iOS` in `packages/expo-router`. 3 suites, 154 tests passed.
- The same three files with `--selectProjects Android`. 3 suites, 103 tests passed.
- `pnpm typecheck` in `packages/expo-router`. Passed.
- `pnpm lint` in `packages/expo-router`. Passed.
- Vale on `docs/pages/router/advanced/native-tabs.mdx`. 0 errors.

No iOS simulator run. This environment has no Xcode.

# Screenshots

### iOS

No simulator run. This environment has no Xcode, so there are no before or after screenshots.

# Checklist

- [x] I added a changeset and followed [this short guide](https://github.com/expo/expo/blob/main/CONTRIBUTING.md#-before-submitting)
- [ ] This diff will work correctly for `npx expo prebuild` & EAS Build (eg: updated a module plugin).
- [x] Conforms with the [Documentation Writing Style Guide](https://github.com/expo/expo/blob/main/guides/Expo%20Documentation%20Writing%20Style%20Guide.md)
