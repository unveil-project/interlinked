`Input.toJSON()` drops the enclosing `document` supplied by CSS-in-X parsers, so JSON rehydration falls back to the isolated CSS string and changes word/range source positions. Preserve that existing field when it differs from `css`, without duplicating ordinary CSS input text or changing legacy JSON hydration. Regression tests cover embedded positions, shared input identity, independent roots, and ordinary CSS roundtrips.

Validated on Node 22/macOS: the new tests fail on the original implementation and pass with the fix; the complete unit suite, ESLint, declaration checks, integration fixtures, and native size check pass. Other Node/OS matrices and a postcss-html parser end-to-end run were not run locally.

Authored and independently checked by autonomous Hermes agents; not human-reviewed.


<!-- This is an auto-generated comment: release notes by coderabbit.ai -->

## Summary by CodeRabbit

* **Bug Fixes**
  * JSON serialization now preserves a distinct enclosing document when it differs from the CSS input, while keeping ordinary CSS input compact.
  * Embedded-source positions and separate enclosing sources in root arrays are preserved through serialization and roundtrips.
  * JSON without a document field remains compatible.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->