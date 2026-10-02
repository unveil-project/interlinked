## Brief Information

This pull request is in the type of:

- [x] bug fixing
- [ ] new feature
- [ ] others



### What does this PR do?

Makes radar symbols travel out from the center together with the line and area on the entry animation, as they did in 4.x.



### Fixed issues

- #21774: Radar series: symbols skip the entry animation and appear at their final positions


## Details

### Before: What was the problem?

Root cause: in the `add` branch of `RadarView`, `graphic.initProps(polyline, target, ...)` runs before `updateSymbols(polyline.shape.points, ...)`. Since 5.x, `initProps` animates with `setToFinal: true`, so it already writes the final shape onto the element, so `polyline.shape.points` holds the target points by the time `updateSymbols` reads it. Each symbol is therefore placed at its final position and animated from there to the same position, so it shows up at the end point on the first frame while the line grows from the center.



### After: How does it behave after the fixing?

Fix: pass `getInitialPoints(points)` (the radar center for every point, the same start used for the polygon and polyline) as the start points to `updateSymbols` instead of reading them back from the polyline. The update path is unchanged.

Test: added `test/ut/spec/series/radar.test.ts`, which renders a radar series with the default animation and checks that the first symbol starts at the radar center `[200, 200]`. It fails before the fix (received `[200, 100]`, the final point) and passes after it.



## Document Info

One of the following should be checked.

- [x] This PR doesn't relate to document changes
- [ ] The document should be updated later
- [ ] The document changes have been made in apache/echarts-doc#xxx



## Misc

### Security Checking

- [ ] This PR uses security-sensitive Web APIs.

### ZRender Changes

- [ ] This PR depends on ZRender changes (ecomfe/zrender#xxx).

### Related test cases or examples to use the new APIs

N.A.

### Merging options

- [ ] Please squash the commits into a single one when merging.

### Other information

The reproduction from the issue: https://codepen.io/martinburch/pen/pveWoEy
