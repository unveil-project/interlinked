## PR Checklist

Closes #2593

## Affected scope

- Primary scope: vite-plugin-angular
- Secondary scopes: none

## Recommended merge strategy for maintainer [optional]

- [x] Squash merge
- [ ] Rebase merge
- [ ] Other

## What is the new behavior?

`visitUnaryOperatorExpr` returned `-(operand)` for every `UnaryOperatorExpr`. Unary plus was emitted as negation, and the `++` and `--` operators that Angular adds to the output AST in 22.3 (`count++`, `--count`) were emitted as negation without an error, so the handler or binding never changed the value.

The visitor now looks the operator up in `UNARY_OP_STR`, built at module load from the `UnaryOperator` members present on the installed `@angular/compiler`, as `BINARY_OP_STR` is. It uses `isPrefix` when present to place the operator before or after the operand. An operator missing from the table throws a `[fast-compile] Unsupported UnaryOperator ...` error, as `visitBinaryOperatorExpr` does, instead of emitting wrong code. The operand stays parenthesized as before: `-(x)` is unchanged, and the new forms are `+(x)`, `++(x)` and `(x)--`.

`js-emitter.spec.ts` covers unary plus and minus, operand parenthesization, the unsupported-operator error, and prefix and postfix increment and decrement on Angular versions that define them.

## Test plan

- `vitest run` in `packages/vite-plugin-angular` with the installed `@angular/compiler` 22.2.0: 805 passed, 10 skipped. The four increment and decrement tests are skipped there because the enum members do not exist.
- The same run with `@angular/compiler` 22.3.0-next.1 swapped in: 809 passed, 6 skipped, including the four increment and decrement tests. Against the previous emitter, six of the new tests fail on 22.3.0-next.1 and two on 22.2.0.
- `prettier --check` and `tsc --noEmit` on the library and spec projects are clean. `eslint` reports one existing `no-useless-escape` error on `SINGLE_QUOTE_ESCAPE_RE`, which this change does not touch.
- Not run: `nx format:check`, `pnpm build` and the full `pnpm test`.

## Does this PR introduce a breaking change?

- [ ] Yes
- [x] No
