Fixes #12121

Base UI's `Select.Icon` has a default `children: '▼'` fallback that gets merged into the `render` element. Lucide/SVG icons append unknown children as text nodes inside the `<svg>`, so every trigger's `textContent` ends with `▼` (e.g. `"Apple▼"`). Usually invisible to the eye but breaks `toHaveText`/`getByText` assertions in Playwright and Testing Library.

Setting `children={undefined}` suppresses the default fallback — the `render` prop already provides the icon, so no visible change.

Tracked in Base UI: mui/base-ui#4752