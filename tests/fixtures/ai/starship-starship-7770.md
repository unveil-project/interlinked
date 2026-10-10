#### Description

`humanize_int()` (in `src/utils/mod.rs`) is used by the `claude_context` and `claude_cost` modules to render token and line counts like `1.2k` or `3.4M`. It picks a unit with `while val >= 1000.0`, then formats with `{:.0}` once the value is 10 or more. A value in `[999.5, 1000)` passes the loop check but rounds to `1000` in that format, so it renders as e.g. `1000k` instead of `1M`.

| input     | before  | after  |
|-----------|---------|--------|
| 999499    | `999k`  | `999k` |
| 999500    | `1000k` | `1M`   |
| 999999    | `1000k` | `1M`   |
| 999999999 | `1000M` | `1G`   |

The fix promotes to the next unit once `val` reaches `999.5`, the point where zero-decimal formatting would otherwise print `1000`.

#### Motivation and Context

Token and line counts just under a unit boundary display a wrong, un-normalised value in the prompt. No existing issue.

#### How Has This Been Tested?

- Added `test_humanize_int_rounding_crosses_unit_boundary`. It fails on `main` (`"1000k" != "1M"`) and passes with the fix.
- `cargo test --lib`: 1290 passed, 0 failed, 40 ignored.
- `cargo fmt --check` clean.
- [x] I have tested using **MacOS**
- [ ] I have tested using **Linux**
- [ ] I have tested using **Windows**

#### AI-Assistance

Have you used AI-assistance to author this PR?

- [x] Yes
- [ ] No

If **yes**, describe the scope of assistance:
AI assistance found the bug and wrote the fix and the test. I reviewed the change before submitting it. The change is a one-line threshold change plus one test.

#### Checklist:
- [ ] I have updated the documentation accordingly.
- [x] I have updated the tests accordingly.
- [x] I understand and have read the code I contribute and can answer questions about it.
