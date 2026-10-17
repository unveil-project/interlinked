Apologies for not using the issue template, it didn't seem to fit in with a feature request. Also sorry if this is breaking any rules.

I'm trying to make a package (even if it's only me who uses it) for eslint rule configs in TypeScript, and I can see that in your repo you already create TypeScript interfaces/types for the config a rule accepts, however these aren't present (from what I could see at least) when installing from npm in the node_modules.

I can see in all/most of your rules you have an `Options` interface/type (like [here](https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/src/rules/ban-ts-comment.ts)) and it would be very appreciated if it could be somehow changed to include these in what is published to npm, as it would save me a lot of duplication and time of having to copy what's already been done.

[What my project is so far](https://github.com/AllySummers/eslint-typescript-config/tree/master/packages/eslint-typescript-config/src/lib) (it's extremely early, I just spent the last few hours TypeScript-ifying the core ESLint rules)
