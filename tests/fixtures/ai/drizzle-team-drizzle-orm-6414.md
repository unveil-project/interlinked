## Summary
Implemented a standardized error handling system to wrap low-level database driver errors into meaningful Drizzle-specific exceptions.

Changes:
- Created `src/errors.ts` containing `DrizzleError`, `DrizzleQueryError`, and `DrizzleConnectionError` classes.
- Added a `wrapError` utility function to ensure that driver errors are wrapped while preserving the original error stack and avoiding the wrapping of native JavaScript runtime errors (like `TypeError`).
- Provided a pattern in `src/runtime/index.ts` for integrating this error handling into the query execution pipeline.

This prevents the leaking of raw driver errors and provides a consistent API for users to catch and handle ORM-related failures.

Closes #376
/attempt
/claim #376

Bounty Reward Wallet: 0x96eE7904BdCd8a82c71B4FFc3362C96b1Aae03e0 (Base / EVM)
