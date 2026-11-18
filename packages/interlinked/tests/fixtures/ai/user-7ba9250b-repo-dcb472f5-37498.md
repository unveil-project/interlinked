## Current Behavior

When Nx runs inside a git hook (for example a pre-commit hook in a linked worktree), git exports variables such as `GIT_INDEX_FILE` and `GIT_DIR`. `clone-ai-config-repo.ts` runs `git ls-remote` and `git clone` for `nx-ai-agents-config` through `execSync` without an explicit `env`, so those commands inherit the hook's environment. The clone then writes into the caller's index, which corrupts it.

## Expected Behavior

The `ls-remote` and `clone` commands run with the repository-local git variables removed: the names reported by `git rev-parse --local-env-vars`, plus `GIT_NAMESPACE` and the indexed `GIT_CONFIG_KEY_<n>` / `GIT_CONFIG_VALUE_<n>` pairs. Everything else, including `PATH` and non-local settings like `GIT_SSH_COMMAND`, is passed through unchanged, and `process.env` itself isn't modified.

Added `clone-ai-config-repo.spec.ts`, which sets the hook variables and checks that neither git command receives them while `PATH` and `GIT_SSH_COMMAND` are kept. It passes with vitest, along with the prepush checks.

## Related Issue(s)

Fixes #37436