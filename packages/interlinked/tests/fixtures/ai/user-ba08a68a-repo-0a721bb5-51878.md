# Why

TypeScript rejects the `expo-router/testing-library` Jest matchers. `toHavePathname`, `toHavePathnameWithParams`, `toHaveSegments`, `toHaveSearchParams`, and `toHaveRouterState` report TS2339. The tests still pass at runtime.

The matcher types live in `src/ts-declarations/expect.d.ts`. No published entry imports that file. #36485 moved the `jest.Matchers` augmentation out of the testing-library entry. The package typecheck still includes that declaration, so the package itself compiles. A consumer that imports `expo-router/testing-library` does not see the matchers.

Fixes #51870

# How

Two solutions were possible.

1. Put `declare global` back in `src/testing-library/index.tsx`. The entry already imports `./expect` for the runtime matchers. This adds no runtime work. The matcher names then sit next to the render helpers.
2. Put `declare global` in `src/testing-library/expect.ts`. The entry already imports that module, and declaration emit keeps `import './expect'` in `build/testing-library/index.d.ts`. This adds no runtime work. A triple-slash reference from the entry to the old declaration file does not publish the types, because `tsc` drops a reference to a file that is already part of the compilation.

This pull request uses solution 2. The expect module owns the matcher names, and the published entry already imports it.

The diff moves the `jest.Matchers` augmentation into `src/testing-library/expect.ts` and deletes `src/ts-declarations/expect.d.ts`. The interface is `Matchers<R>`, which matches `@types/jest` 30 and the other Jest augmentations in this repository. `Matchers<R, T = unknown>` fails package typecheck with TS2428 when it is inside `declare global`.

# Test Plan

From `packages/expo-router` on Linux, Node 22:

1. `pnpm exec jest src/testing-library/__tests__/matcher-types.test.node.ts --watchman=false`
   Result: 2 passed. Before the source change, the same test failed with TS2339 on all five matchers.
2. `pnpm typecheck`
   Result: passed.
3. `pnpm lint`
   Result: passed.
4. `pnpm run build:lib`
   Result: passed. `build/testing-library/expect.d.ts` contains the `declare global` augmentation. `build/testing-library/index.d.ts` starts with `import './expect'`.
5. A small `tsc` program imported the built `expo-router/testing-library` types with `"types": ["jest"]`.
   Result: all five matchers typecheck, including `.not.toHavePathname`.
6. Loading `build/testing-library/expect.js` still registers the same five runtime matchers.

# Screenshots

No UI change.

# Checklist

- [x] I added a changeset and followed [this short guide](https://github.com/expo/expo/blob/main/CONTRIBUTING.md#-before-submitting)
- [ ] This diff will work correctly for `npx expo prebuild` & EAS Build (eg: updated a module plugin).
- [ ] Conforms with the [Documentation Writing Style Guide](https://github.com/expo/expo/blob/main/guides/Expo%20Documentation%20Writing%20Style%20Guide.md)
