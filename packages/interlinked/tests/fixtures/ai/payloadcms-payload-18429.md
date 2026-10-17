## Bug
In a production build, REST error responses can lose `data` (for example a ValidationError's `data.errors` with the field paths). The status and message come through, but `formatErrors` returns `{ errors: [{ message }] }`. This happens when the error was thrown by a different bundled copy of payload than the one running `formatErrors`, which #18420 traces to the route handler and page layers each getting their own copy.

## Root cause
On 3.x, `formatErrors` only keeps `data` when `incoming instanceof ValidationError || incoming instanceof APIError`. Errors created by another copy of the module have different class identities, so both checks are false. The Mongoose fallback doesn't match either, since it compares `name`, which is minified. The error falls through to the message-only branch.

## Solution
Backport the check that `main` already has: alongside `instanceof`, accept any error with `isOperational === true` (set in `ExtendableError`'s constructor for every Payload error) that carries `data`. Behaviour for real instances is unchanged. This restores `data`. It does not touch the minified `name` (#13645), which is a separate problem.

Fixes #18420

## Testing
- Added `should keep data for a Payload error thrown by another copy of the error classes` to `packages/payload/src/utilities/formatErrors.spec.ts`. It builds a ValidationError-shaped error from an unrelated class with a minified name. It fails on `3.x` (no `data` in the result) and passes with this change.
- `formatErrors.spec.ts`: 8/8 passing.
- `vitest run --project unit packages/payload/`: 974/977 passing. The 3 failures are `src/bin/index.spec.ts` (CLI exit codes) and fail the same way without this change in my local setup.
- `tsc --noEmit` for packages/payload passes.
