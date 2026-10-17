## Description

`to md` wrote line breaks inside table cells as-is, so a multi-line value split its row and broke the table:

```nushell
> [[name note]; [a "line 1\nline 2"] [b ok]] | to md
| name | note |
| --- | --- |
| a | line 1
line 2 |
| b | ok |
```

A Markdown table row can't span lines, so this rendered as a one-row table followed by a stray paragraph. Pipes in cells are already escaped for the same reason.

With this change, line breaks (`\n` and `\r\n`) in table cells and headers are written as `<br>`, which GitHub and other common renderers show as a line break inside the cell:

```nushell
> [[name note]; [a "line 1\nline 2"] [b ok]] | to md
| name | note |
| --- | --- |
| a | line 1<br>line 2 |
| b | ok |
```

Lists and single values are not tables and are unchanged.

## User-facing changes (Release notes)

Fixed `to md` producing broken tables when a cell contains a line break; line breaks in table cells are now written as `<br>`.

## Additional notes

Added `test_line_breaks_in_table_cells`, which fails on `main` and passes with this change. `cargo fmt --all -- --check` and `cargo clippy -p nu-command --all-targets -- -D warnings` pass. `cargo test -p nu-command` passes apart from four tests that depend on file permissions or DNS (`cd_permission_denied_folder`, `mkdir_continues_creating_directories_after_error`, `rm_prints_filenames_on_error`, `helpful_dns_error_for_unknown_domain`), which fail in my sandbox because it runs as root without network access.
