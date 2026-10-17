**What this PR does / why we need it**:

`LogfmtExpressionParser.Process` builds a map of new label to source field, then reverses it for each scanned key:

```go
for id, orig := range keys {
    if key == orig {
        key = id
        break
    }
}
```

The `break` stops at the first match, so `| logfmt lvl=level, severity=level` only fills one of the two. The other keeps the empty string that was pre-set earlier in the function, and which one wins depends on map iteration order, so it varies between queries. Nothing errors.

It now gathers every expression naming that key, sorted for stability, and sets each. With a single expression the path is unchanged, including the early break out of the scan loop, which I kept as a labelled break rather than quietly turning it into a continue.

**Which issue(s) this PR fixes**:

**Special notes for your reviewer**:

Added a "two labels from one field" case to `TestLogfmtExpressionParser`. It fails on main and passes here, and the rest of `pkg/logql/log` is green.

The JSON expression parser builds its mapping differently and does not have this, so this is logfmt only.

**Checklist**
- [x] Reviewed the [`CONTRIBUTING.md`](https://github.com/grafana/loki/blob/main/CONTRIBUTING.md) guide (**required**)
- [ ] Documentation added
- [x] Tests updated
- [x] Title matches the required conventional commits format, see [here](https://www.conventionalcommits.org/en/v1.0.0/)
- [ ] Changes that require user attention or interaction to upgrade are documented in `docs/sources/setup/upgrade/_index.md`
- [ ] If the change is deprecating or removing a configuration option, update the `deprecated-config.yaml` and `deleted-config.yaml` files respectively in the `tools/deprecated-config-checker` directory.
