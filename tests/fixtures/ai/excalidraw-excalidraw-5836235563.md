Rebased, and the fix is smaller than it was. `e40d1cba` ("compact styles panel", #12163) rewrote `Range` to drive the track and the value bubble from a `--range-progress` custom property, removing the `useEffect` this PR used to patch. The physical CSS properties came across unchanged, so the RTL behaviour is still wrong — it just lives entirely in `Range.scss` now, and `Range.tsx` is untouched by this PR.

Measured in Chromium at value 70 on a 260px track:

|  | LTR | RTL |
| --- | --- | --- |
| before | bubble centred on the thumb, 0px off | **97.6px off**, zero label 248.4px from the logical start |
| after | bubble centred on the thumb, 0px off | **0px off**, zero label 4px from the logical start |

LTR geometry is identical before and after, so this is RTL-only. The third part is the track: under `dir="rtl"` the fill ran from the physical left, and it now runs from the logical start. The override follows the `:root[dir="rtl"] &` pattern already used in `Actions.scss` and `ColorPicker.scss`.
