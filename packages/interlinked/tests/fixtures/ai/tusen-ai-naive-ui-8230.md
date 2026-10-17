Resizing fixed columns in the #8229 virtual table can leave gaps or overlap, and shrinking a right fixed column can also change an untouched neighbour's displayed width.

Use the resized widths consistently for fixed offsets, virtual positions, cell dimensions and total virtual scroll width. Keep the virtual middle cells inside one spanning table cell to avoid an extra anonymous table-layout slot. Synchronize positions after width clamping and only suppress echoed scroll positions, so the next body or header scroll still works. Input column definitions and resize limits are preserved.

Fixes #8229.

Regression coverage includes ordinary fixed columns and the 1000×1000 virtual workflow: shrink before grow, untouched neighbours, both fixed edges, middle columns, far-right and distant-row content, repeated scrolling/resizing, clicks and hover. Only-left, only-right and no-fixed configurations are included. Chromium layout tests and software-operated Chrome pointer checks pass; reporter confirmation is pending.

Validation on Node 24 / pnpm 11:

- `pnpm run lint`, the final staged-file formatter/linter, and `pnpm run build:package` pass, including ESM/UMD smoke tests and the artifact check.
- Final DataTable component suite: 74 tests pass. Chromium browser suite: 16 tests pass.
- Full coverage run with two workers: 1,246 tests pass; the unchanged `locale > works` test exceeds its default 5-second limit. Running that locale file alone with coverage and the same timeout passes all 3 tests. The run also emits existing jsdom canvas and ResizeObserver teardown notices.
- A freshly packed archive installs in a separate Vue 3.5.43 project and passes the two-edge resize/scroll browser smoke check.
