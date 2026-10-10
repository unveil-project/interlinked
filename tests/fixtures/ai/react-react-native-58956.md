Summary:

`JSBundleType.h` exposes bundle-format detection internals (`BundleHeader`, `ScriptTag`, `parseTypeFromHeader`, `isHermesBytecodeBundle`). Within React Native it is only used by the bundle loaders, but out-of-tree platforms read `BundleHeader` directly, so it is classified as "for frameworks" rather than private.

Remove `JSBundleType.h` from the `<React/JSBigString.h>` umbrella: a public umbrella that includes it would keep its symbols public regardless of its guard. Frameworks include `<cxxreact/JSBundleType.h>` directly.

The C++ API snapshots are regenerated: these symbols are removed from the Debug, Release and Newarch snapshots and stay in the Frameworks snapshots.

Changelog: [Internal]

Reviewed By: cipolleschi

Differential Revision: D124104985
