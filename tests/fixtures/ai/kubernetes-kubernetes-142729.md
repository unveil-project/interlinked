
#### What type of PR is this?
/kind documentation
/sig cloud-provider

#### What this PR does / why we need it:
The `HasClusterID` doc only said what the method returns. It now says the cloud-controller-manager calls it once at startup, refuses to start on `false` unless the deprecated `--allow-untagged-cloud` is set, and that the framework never reads the ID, so storage and use are provider-defined. Comment-only change.

#### Which issue(s) this PR is related to:
Fixes #128320

#### Special notes for your reviewer:
Verified against the call sites in `cmd/cloud-controller-manager/main.go` and `staging/src/k8s.io/cloud-provider/sample/basic_main.go`. No other code reads the ID. No test added since this is documentation only.

#### Does this PR introduce a user-facing change?
```release-note
NONE
```

#### AI usage disclosure:
YES - AI drafted the comment after reading the call sites. The human author owns this submission. See AGENTS.md and CONTRIBUTING.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

