## Current Behavior

`TargetProjectLocator.readPackageJson` resolves `path.join(packageName, 'package.json')`. On POSIX that's a real subpath specifier, so for a package whose `exports` don't include `./package.json` (for example `@stencil/core` 4.44.2) Node throws `ERR_PACKAGE_PATH_NOT_EXPORTED`. The fallback then walks up from the main entry and stops at the first manifest with a `name` and `version`, which can be a nested one such as `@stencil/core/internal`. The dependency is attributed to the wrong package, and `enforce-module-boundaries` with `banTransitiveDependencies` flags a package that is actually a direct dependency. On Windows `path.join` produces a backslash specifier, which happens to sidestep `exports`, so the behavior differs by OS.

## Expected Behavior

- The specifier is always built with `/`, so every OS honors `exports` the same way.
- If that lookup fails or only finds a module-format stub, the locator reads the install root (`node_modules/<name>/package.json`) derived from the resolved entry path. This also works with pnpm's store layout, and aliases keep that file's own name.
- While walking up, a manifest whose `name` is a subpath of the requested package is skipped instead of returned.
- Packages that do export `./package.json` keep using that file as before.

Added a test in `target-project-locator.spec.ts` for a package that hides `package.json` behind `exports` and ships a nested manifest; it failed before the change and the full spec (204 tests) passes after it.

## Related Issue(s)

Fixes #37488