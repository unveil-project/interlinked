Two helper commands under `hack/` open files with `os.Open` and return without closing them.

- `hack/aead/aead.go` opens the input file when `-f` is used.
- `hack/role/role.go` opens the manifest before parsing the Azure credentials request.

Both are short-lived helpers, but repeated use still leaks descriptors unnecessarily.

I have a patch ready that closes the opened files after the read/parse path completes.
