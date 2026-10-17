### What's being changed:

`text2vec-palm` is the legacy alias of `text2vec-google`. Property settings stored under that key were ignored, so `skip` and `vectorizePropertyName` fell back to their defaults and every text property was vectorized. Class-level settings already try the alias. `ClassBasedModuleConfig.Property` now falls back to `text2vec-palm` when the canonical name is missing.

`go test -run TestPalmPropertyLevelSkipIsIgnored ./modules/text2vec-google/vectorizer/` failed on both palm rows before the change (the skipped property was included) and passes for the google and palm keys, with and without a named vector, after it.

fixes #13429

### Review checklist

- [ ] Documentation has been updated, if necessary. Link to changed documentation: not necessary
- [ ] Chaos pipeline run or not necessary. Link to pipeline: not necessary
- [x] All new code is covered by tests where it is reasonable.
- [ ] Performance tests have been run or not necessary. not necessary
