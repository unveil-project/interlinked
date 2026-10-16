Fixed the P1 in commit `afb4893`.

The issue was that a preceding existing-PR group could take the metadata-only path in `pushRepoBranch()`, reset and clean the clone, and discard the captured `teamai.yaml` before the explicit new-branch group ran.

The fix restores the captured config after every preceding reuse-group push, including metadata-only cleanup and handled failure paths, before the new explicit-branch group runs.

Added a real CLI regression test covering:

- an existing PR with a rule change containing only `lastUpdated` metadata;
- a new resource pushed with `--branch`;
- an edited `teamai.yaml` in the same invocation.

The test verifies that the config lands on the explicit new branch and not on the existing PR branch.

Verification:

- typecheck passed
- build passed
- focused unit tests: 108 passed
- real CLI Push E2E: 21 passed
