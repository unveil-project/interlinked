Implemented parsing for SSH source URLs that use a custom username, such as GitHub Enterprise Data Residency remotes like `acme@acme.ghe.com:Org/repo.git`. The parser now preserves the SSH username in the clone URL, skips GitHub shorthand expansion for these inputs, and normalizes custom-username SSH URLs for conflict detection.

This fixes installs from GHE Data Residency environments where the SSH username is not `git`.

Fixes #176

Tests:
- `go test ./internal/install -run 'TestParseSource_GitSSH|TestParseSource_GitHubEnterprise|TestParseSource_GitHubEnterprise_TrackName|TestNormalizeCloneURL'`
- `./scripts/test.sh --unit --quiet`
- `./scripts/test.sh --quiet`