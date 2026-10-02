Fixes #30367

## Summary

A nested `$transaction` no longer writes `newTxId` into the options object you pass in. Before this change, reusing one options object (for example a shared `{ timeout, maxWait }` constant) after a nested call made later top-level transactions start as nested transactions against a stale transaction id. That fails with P2028 when the outer transaction has closed, and joins another request's open transaction when it has not.

`_transactionWithCallback` now sends the nested transaction id to the engine directly and only for nested calls.

## Testing

- Added `packages/client/src/__tests__/nestedTransactionOptions.test.ts`. It runs a nested `$transaction` with a shared options object on an in-memory better-sqlite3 adapter, asserts the object is unchanged, then runs a top-level transaction with the same object.
- `pnpm exec jest src/__tests__/nestedTransactionOptions.test.ts` in `packages/client` fails without the fix (`newTxId` appears on the options object) and passes with it.
- `prettier --check` passes on the touched files, and `eslint` reports no new warnings.


<!-- This is an auto-generated comment: release notes by coderabbit.ai -->

## Summary by CodeRabbit

* **Bug Fixes**
  * Nested transactions no longer alter shared transaction options, allowing those options to be reused in a subsequent top-level transaction.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->
