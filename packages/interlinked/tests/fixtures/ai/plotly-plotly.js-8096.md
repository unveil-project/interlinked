Fixes #8095 

Fixes four `fillgradient` problems in `scatter` traces. The work on https://github.com/plotly/plotly.js/issues/8093 found them. No upstream issue covers them yet.

Before: A `fillgradient` with `start` or `stop` keeps its old bounds after a zoom or a pan. A single `start` or `stop` throws `Cannot read properties of undefined (reading 'max')` on a secondary axis, and gives a wrong bound on a log axis. A *radial* `fillgradient` with `start` or `stop` throws `Cannot read properties of undefined (reading 'x')`.

After: The gradient follows zoom and pan. A missing bound takes the lowest or highest value of the trace on its own axis, on linear and log axes. A *radial* gradient ignores `start` and `stop`, as the attribute descriptions state.

How: A new function in `src/components/drawing/index.js`, `axisGradient`, computes the user-space bounds. It reads `trace._extremes` by axis id and converts the extremes with `l2p`, because they are in linear space. `gradientWithBounds` now sets the bounds on every call, not only when it creates the `<linearGradient>`. `setFillStyle` skips the user-space branch for *radial*.

## Tests

- Jasmine `scatter_test`, new block `scatter gradients`: zoom, secondary axis, log axis, and *radial*. I did not run karma. I ran the four test bodies in headless Chromium against `build/plotly.js` with a small jasmine shim. All four pass with the fix and fail on `main`.
- No baseline must move. `scatter_fill_gradient_tonext` and `scatter_fill_gradient_tonexty_toself` render the same plot pixels before and after the change.
- `npm run lint`, `npm run typecheck`, `npm run test-syntax` and `npm run schema-typegen-diff-check` pass.

## Draftlog

`draftlogs/8096_fix.md` carries the upstream PR number 8096.

