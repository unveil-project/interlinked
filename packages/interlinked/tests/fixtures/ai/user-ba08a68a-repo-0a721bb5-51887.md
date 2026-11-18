# Why

During SSR, `@expo/router-server` stores loader data under the raw URL query string. `useLoaderData()` looks it up using the router's normalized query string. Encoding, route parameter filtering, and query key ordering can produce different keys.

When the keys differ, `useLoaderData()` returns `undefined` during server rendering. This can cause missing server-rendered content and hydration errors.

Fixes #51877.

# How

Both `renderStreamingContent` and `renderStaticContent` build the loader key from the `searchParams` returned by their existing `getRouteInfoForMatchedRoute()` call. This matches the key used by `useLoaderData()`.

# Test Plan

- CI.
- Test against the [reporter's repro](https://github.com/dub578/expo-router-loader-query-key-repro).

# Screenshots

No UI change.

# Checklist

- [x] I added a changeset and followed [this short guide](https://github.com/expo/expo/blob/main/CONTRIBUTING.md#-before-submitting)
- [ ] This diff will work correctly for `npx expo prebuild` & EAS Build (eg: updated a module plugin).
- [ ] Conforms with the [Documentation Writing Style Guide](https://github.com/expo/expo/blob/main/guides/Expo%20Documentation%20Writing%20Style%20Guide.md)

