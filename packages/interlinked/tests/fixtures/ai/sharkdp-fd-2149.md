Fixes #1513.

**Problem:** With `--full-path`, a search path containing `..` is matched against an un-normalized absolute path. From `/tmp/1/2`, `fd -p '/1/foo' ..` prints nothing, but `fd -p --absolute-path '/1/foo' ..` finds `/tmp/1/foo`. `--absolute-path` should not change the result set.

**Cause:** `search_str_for_entry` joins the cwd with the entry path (`/tmp/1/2/../foo`) without resolving `..`, whereas `--absolute-path` normalizes the search path up front.

**Fix:** When the path to match contains a `..` component, normalize the parent directory (via `normpath`, as `--absolute-path` does) and re-attach the file name. Paths without `..` take the same code path as before, so there's no extra cost for the common case.

**Testing:** Added `test_full_path_with_parent_dir_search_path`, which fails before the change and passes after. Full `cargo test` passes; `cargo fmt --check` is clean.