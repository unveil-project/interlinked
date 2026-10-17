### Bug

With `errorMode: 'ignore'` or `'warn'`, converting a `string` (or any non-number) schema that carries `minValue`/`maxValue`/`gtValue`/`ltValue` produces an invalid JSON Schema: the string requirement is written into `minimum`/`maximum`/`exclusiveMinimum`/`exclusiveMaximum`, which must be numbers.

### Repro (published `@valibot/to-json-schema` 1.7.1, `valibot` 1.4.2)

```js
import * as v from 'valibot';
import { toJsonSchema } from '@valibot/to-json-schema';

toJsonSchema(v.pipe(v.string(), v.minValue('m')), { errorMode: 'ignore' });
// => { type: 'string', minimum: 'm', $schema: '.../draft-07/schema#' }
```

`v.pipe(v.string(), v.minValue('m'))` is a valid Valibot schema (lexicographic string comparison). Ajv rejects the emitted schema: `schema is invalid: data/minimum must be number`. The same happens with `maxValue` (`maximum`), `gtValue` (`exclusiveMinimum`) and `ltValue` (`exclusiveMaximum`), in both `'ignore'` and `'warn'` modes.

### Expected vs actual

The README says non-throw modes ignore unsupported actions (e.g. `v.pipe(v.string(), v.creditCard())` with `errorMode: 'ignore'` → `{ type: 'string' }`, which I confirmed). So the expected output here is `{ type: 'string' }`. The actual output injects a non-numeric `minimum`, which violates the JSON Schema meta-schema.

### Cause

In `packages/to-json-schema/src/converters/convertAction/convertAction.ts`, the `min_value`/`max_value`/`gt_value`/`lt_value` cases record the "not supported on type" error but then still assign the numeric keyword unconditionally (e.g. `jsonSchema.minimum = valibotAction.requirement as number`). That assignment should be skipped when the type isn't `number`/`integer`, like the existing OpenAPI and `includes` branches already do.
