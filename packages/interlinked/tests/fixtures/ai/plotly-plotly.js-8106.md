Fixes #8099.

Expire bounding boxes measured while web fonts load, once the fonts settle. The next partial redraw then measures the loaded font. Preserve cache hits during the draw and entries measured before loading began. This does not trigger an extra redraw.

Drawing, plot API, and treemap tests: 285 pass. One existing uniformtext scale test fails identically on unchanged source. Typecheck, lint, syntax, and generated-schema checks pass.

![Partial treemap zoom after a delayed font load](https://raw.githubusercontent.com/minwookshin/plotly.js/docs/reviewed-ui-evidence-2026-10-03/plotly-fonts-final.png)

Code assistance: OpenAI Codex; changes reviewed by the contributor.
