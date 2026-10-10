`"extends": "@tsconfig/node20"` is the form the TypeScript docs give for the shared base configs, but the loader appended `.json` and looked for `node_modules/@tsconfig/node20.json`, which doesn't exist, so the base config was silently ignored. A bare specifier is now resolved the way tsc does within the config's `node_modules`: a file in the package, the `"tsconfig"` field of its `package.json`, or the `tsconfig.json` at its root. Still no `node_modules` walk-up or `exports` resolution (#41989).

Fixes: https://github.com/microsoft/playwright/issues/43234
