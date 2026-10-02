TypeScript 7.1 adds content mappers: a package listed in `tsconfig.json` that tells `tsc` what a non-TypeScript file exports. With one installed, imports of `.mdx`, `.yaml`, etc can be strongly typed instead of loosely typed based on a hand-written `declare module`. 

TypeScript only runs content mappers when `tsc` is started with `--runExternalCode`, and there is no way to add that flag to the type check `next build` runs. This PR passes `--runExternalCode` when the project's TypeScript is 7.1 or newer, prereleases included.

I tried it against Next 16.3.8 on TypeScript 7.1: build passing & content mapper working as intended. TypeScript 7.0 and 6.0 projects build as before & there's a unit test for the version check and a line in the `useTypeScriptCli` docs.
