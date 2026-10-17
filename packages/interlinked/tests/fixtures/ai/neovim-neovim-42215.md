## Problem

There is no way to check whether the editor is in a "text locked" state (`:h textlock`, e.g. while an `<expr>` mapping is evaluated), where buffer text cannot be changed. A callback that wants to do work right away, such as showing a notification in a floating window, has to try it and catch the error. Fix #38034.

## Solution

Add the "l" flag to `state()`, set while `text_locked()` is true. `state('l')` can be used to check for it, like the other flags.

```vim
nnoremap <expr> ;l Get()   " Get() stores state() and returns ''
```
Before: `state('l')` is `''` inside the mapping, `state()` is `oS`.
After: `state('l')` is `l` inside the mapping, `state()` is `oSl`; outside it stays `''`.

Updated `vimfn.txt` (from `eval.lua`) and `news.txt`. Test: `test/functional/vimscript/state_spec.lua` (expr mapping and `InsertCharPre` autocommand, plus unchanged default).

Not included: a "fast" flag (mentioned in the issue), other lock kinds.

