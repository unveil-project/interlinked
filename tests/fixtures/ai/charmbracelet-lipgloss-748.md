### Summary

Fixes #236.

In `PlaceHorizontal` and `PlaceVertical`, non-constant fractional positions (such as `0.25`, or floats near boundaries like `0.000000001` and `0.999999999`) were calculating padding backwards.

### Root Cause

In `PlaceHorizontal`:
```go
split := int(math.Round(float64(totalGap) * pos.value()))
left := totalGap - split
right := totalGap - left
```
When `pos` is close to `0.0` (`Left`), `split` evaluates to `0`. `left` was computed as `totalGap - split = totalGap`, placing all whitespace on the left and pushing the content to the right edge. Conversely, when `pos` is close to `1.0` (`Right`), `left` was computed as `0`, placing all whitespace on the right and pushing content to the left edge.

Similarly, in `PlaceVertical`:
```go
split := int(math.Round(float64(gap) * pos.value()))
top := gap - split
bottom := gap - top
```
When `pos` is close to `0.0` (`Top`), `top` was assigned `gap - split = gap`, rendering all empty lines above the text and pushing it to the bottom.

In contrast, `JoinVertical` already uses the intended layout:
```go
split := int(math.Round(float64(w) * pos.value()))
right := w - split
left := w - right // left == split
```

### Fix

In `PlaceHorizontal`, assign `left := int(math.Round(float64(totalGap) * pos.value()))` and `right := totalGap - left`.
In `PlaceVertical`, assign `top := int(math.Round(float64(gap) * pos.value()))` and `bottom := gap - top`.

### Verification

- Added `position_test.go` covering `PlaceHorizontal`, `PlaceVertical`, and `Place` with constant positions (`Left`, `Right`, `Top`, `Bottom`, `Center`), float values (`0.0`, `1.0`), fractional positions (`0.2`, `0.25`, `0.8`), boundary float values (`0.000000001`, `0.999999999`), multiline text, and no-op size cases.
- Ran full test suite across all packages (`go test -count=1 ./...`); all tests pass.
