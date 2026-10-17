register(name) calls watch(name) (core/src/index.tsx:65). The function form of watch subscribes the **host component** to that field, so a form that registers N fields re-renders all N on every keystroke in any of them — exactly what RHF's uncontrolled model exists to avoid.

Observed in a real consumer (a ~2000-line profile form): it falls back to RHF `<Controller>` 19 times in one file, and ~38 across the project, specifically because Controller isolates the subscription via `useController` and `register` cannot.

### Proposal
Ship a field-level primitive that subscribes in isolation:
- a `<Field name=... />` component, or
- a `useMuiField(name)` hook backed by `useController`,

so each field re-renders alone. Keep `register` for small forms, but document that it is controlled-via-`watch` and does not scale.

This is the single highest-impact change — it removes the reason consumers reach for `<Controller>` at all.
