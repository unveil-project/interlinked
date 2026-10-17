Fixes #12763

**What**

`ToolProperty.ToTypeScriptType()` ignored `Enum`, so a parameter declared as `{"type": "string", "enum": ["celsius", "fahrenheit"]}` was rendered to the gpt-oss/Harmony template as plain `string`. The model never saw the allowed values.

Now an enum renders as a literal union, e.g. `"celsius" | "fahrenheit"`. An array whose items are an enum renders as `("a" | "b")[]`. If any enum value is not a scalar (string, number, bool, null), it falls back to the previous type-based output, so nothing that rendered before gets worse.

**Why**

The Harmony tool format uses TypeScript-style signatures, where a string enum is written as a literal union. The issue reports this is the missing piece.

**Scope / behavior change**

This changes the rendered prompt for any template that calls `toTypeScriptType` on a parameter that has an `enum`. Parameters without an enum are unchanged. I have not measured any change in model output quality.

**Verification**

- Added table cases for string, number and mixed enums, array of enums, and a non-scalar fallback, plus `TestToolPropertyEnumFromJSONToTypeScriptType`, which decodes real JSON.
- Before the fix, 4 table cases and the JSON test fail (got `string`, wanted the union). After the fix they pass.
- `go test ./api ./template ./harmony`, `go vet ./api` and `gofmt` are clean.
