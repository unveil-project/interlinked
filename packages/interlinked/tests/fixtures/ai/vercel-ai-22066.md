## Summary
- move release and snapshot notifications to a post-Release `workflow_run`
- pass published package metadata and snapshot package manifests through a one-day artifact
- release the branch concurrency lock before notification waits for npm propagation

## Verification
- `npm test` in `.github/scripts/notify-released`
- validated both workflow files as YAML
