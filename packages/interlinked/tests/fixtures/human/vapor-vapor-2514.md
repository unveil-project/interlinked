Forward the arguments passed to `DotEnvFile.load(for:on:logger)` to `DotEnvFile.load(path:on:logger)`.

This ensures that the passed in `EventLoopGroupProvider` and `Logger` actually get used instead of default ones.