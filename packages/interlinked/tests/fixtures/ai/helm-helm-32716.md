**What this PR does / why we need it**:
`File.WriteFile` used `os.WriteFile`, which truncates the target repositories file prior to writing. If the write fails (e.g. disk full, quota exhaustion) or the process terminates prematurely, `repositories.yaml` is left empty. This switches `File.WriteFile` to `fileutil.AtomicWriteFile` to ensure updates are written to a temporary file and atomically renamed, matching `index.go` and `chartrepo.go`.

Closes #32709

**Special notes for your reviewer**:
None.

**If applicable**:
- [ ] this PR contains user facing changes (the `docs needed` label should be applied if so)
- [x] this PR contains unit tests
- [x] this PR has been tested for backwards compatibility