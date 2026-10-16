Understood — code-locking the legacy manual types is a reasonable call, and better to hear it now than after they diverge further. No objection to closing.

One thing worth leaving behind for whoever finds #52957 next: the report names both `ImageStyle` and `TextStyle`, but only `ImageStyle` is affected. `StyleSheetTypes.d.ts:562` already reads `export interface TextStyle extends TextStyleIOS, TextStyleAndroid, ViewStyle`, and I verified with a `tsc` probe against the legacy types that a `TextStyle` literal containing `filter`, `boxShadow`, `mixBlendMode`, `outlineColor` and `isolation` typechecks cleanly on unmodified `main`. So anyone hitting this on `TextStyle` today is looking at a different problem.

For `ImageStyle` the practical answer is `react-native-strict-api`, where `____ImageStyle_InternalCore` already spreads `ViewStyle` correctly. Happy to add that note to #52957 if it would help close it out.
