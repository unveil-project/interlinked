If `g:fzf_layout.window.border` is empty, and `--border` or `--no-border`
is absent, draw border manually by (neo)vim.

If `g:fzf_layout.window.border` is empty, but `--border` or `--no-border`
is existed, respect native option (border or no border) instead of
always drawing border by (neo)vim.

If `g:fzf_layout.window.border` is existed, ignore native options and
use (neo)vim's layout to draw border.

For now, the default border in the popup is the same as fzf's native border, we should respect the fzf's border options.
If I'm wrong please correct me.