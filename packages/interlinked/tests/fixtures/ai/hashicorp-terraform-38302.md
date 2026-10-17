## Terraform Version

Latest `main` branch (verified in current source before the fix in PR #38311).

## Terraform Configuration Files

```terraform
# Internal Terraform Core code path only; no end-user configuration is required.
```

## Debug Output

```text
N/A. This issue is reproducible by code inspection and by repeatedly calling
`internal/modsdir.Manifest.WriteSnapshotToDir` in a small Go test.
```

## Expected Behavior

`WriteSnapshotToDir` should close the file it creates after writing the module manifest.

## Actual Behavior

`internal/modsdir/manifest.go` calls `os.Create(fn)` and passes the resulting `*os.File` to `WriteSnapshot(w)` as an `io.Writer`, but never closes it afterward. Repeated calls leak file descriptors and may leave data unflushed until process exit or GC-driven finalization.

```go
func (m Manifest) WriteSnapshotToDir(dir string) error {
    fn := filepath.Join(dir, ManifestSnapshotFilename)
    w, err := os.Create(fn)
    if err != nil {
        return err
    }
    return m.WriteSnapshot(w) // w is never closed
}
```

## Steps to Reproduce

1. Check out Terraform `main` before PR #38311.
2. Inspect `internal/modsdir/manifest.go:WriteSnapshotToDir`, or call `Manifest.WriteSnapshotToDir` repeatedly in a loop.
3. Observe that the created `*os.File` is not closed on the success path.

## Additional Context

This is an internal Terraform Core bug rather than a configuration-dependent CLI workflow issue.
A similar file-descriptor leak exists in `internal/pluginshared/binary.go` around the `os.Create(manifestCacheLocation)` call, but I kept this issue scoped to `modsdir.WriteSnapshotToDir`.

## References

- PR #38311

## Generative AI / LLM assisted development?

Static analysis tooling with LLM-based inference assistance helped surface the missing `Close`/`defer Close()` path.
