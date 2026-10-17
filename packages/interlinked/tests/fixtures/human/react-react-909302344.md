Looks like [Circle CI is failing on this PR](https://app.circleci.com/pipelines/github/facebook/react/17944/workflows/fd8a6e85-4045-4a31-9182-0618979a805d/jobs/366415):
```
Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
 - configuration.output has an unknown property 'chunkFileName'. These properties are valid:
   object { auxiliaryComment?, chunkCallbackName?, chunkFilename?, chunkLoadTimeout?, crossOriginLoading?, devtoolFallbackModuleFilenameTemplate?, devtoolLineToLine?, devtoolModuleFilenameTemplate?, devtoolNamespace?, filename?, futureEmitAssets?, globalObject?, hashDigest?, hashDigestLength?, hashFunction?, hashSalt?, hotUpdateChunkFilename?, hotUpdateFunction?, hotUpdateMainFilename?, jsonpFunction?, jsonpScriptType?, library?, libraryExport?, libraryTarget?, path?, pathinfo?, publicPath?, sourceMapFilename?, sourcePrefix?, strictModuleExceptionHandling?, umdNamedDefine?, webassemblyModuleFilename? }
   -> Options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
```
