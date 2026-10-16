## Summary

A completely empty worksheet produces a heading followed by two lines of broken table syntax, rather than being skipped or rendered as an empty table.

This is the same shape as #2427 (do not emit a Notes heading for a slide with no notes) and #2442 (do not emit a heading for a slide with an empty title), applied to XLSX sheets. The difference is that XLSX does not just emit a bare heading, it emits malformed markdown under it.

## Reproduction

No network and no fixture file needed. Python 3.12, `markitdown[all]` at `5640da7`:

```python
import io
from openpyxl import Workbook
from markitdown import MarkItDown, StreamInfo

wb = Workbook()
wb.active.title = "HasData"
wb.active["A1"] = "col"
wb.active["A2"] = "v"
wb.create_sheet("CompletelyEmpty")

buf = io.BytesIO()
wb.save(buf)
buf.seek(0)

print(MarkItDown().convert_stream(buf, stream_info=StreamInfo(extension=".xlsx")).markdown)
```

## Actual

```markdown
## HasData
| col |
| --- |
| v |

## CompletelyEmpty
|
|  |
```

The last two lines are not a table. There is no delimiter row, so a markdown renderer emits them as literal text.

## Three cases, for precision

```
single completely empty sheet          '## Empty\n|\n|  |'
sheet with a header row but no data    '## HeaderOnly\n| col |\n| --- |'
data sheet followed by an empty sheet  '## HasData\n| col |\n| --- |\n| v |\n\n## Empty\n|\n|  |'
```

Only the completely-empty case is broken. A header row with no data rows already produces a valid empty table, which seems like the right behaviour and is worth preserving in any fix.

## Cause

`_xlsx_converter.py` appends `f"## {s}\n"` for every sheet unconditionally, then hands `sheets[s].to_html(index=False)` to the HTML converter. For an empty frame pandas emits a table with no columns, which markdownify turns into those two lines. There are two identical call sites, one in the XLSX converter and one in the XLS converter, so both are affected.

## Expected

Either skip a sheet with no content entirely, or emit the heading with nothing under it. I would lean toward skipping, matching #2427 and #2442, but the heading may be worth keeping if callers rely on sheet names appearing.

## Note

I have this fixed locally and can open a PR, but I notice the XLSX area currently has eight open PRs and none has merged recently, so I did not want to add a ninth uninvited. Happy to send it if useful, or to leave this as a report.
