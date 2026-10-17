# Description

Fixes #5476.

`SlugInput` only auto-generated while creating (`isReadonly && !entityId && isDirty`). On an existing product or collection, a translation added later — switch the content language to one the entity has no translation for, type a name, save — was stored with `slug: ''`.

It now auto-generates whenever the translation being edited has no saved slug, read from the form's default values:

```ts
const hasSavedSlug = !!get(form.formState.defaultValues, name);
const shouldAutoGenerate = isReadonly && !hasSavedSlug && watchFieldState.isDirty;
```

- Create: unchanged (the default slug is empty).
- Existing translation with a slug: unchanged — renaming never regenerates it.
- Translation without a slug on an existing entity: generated from its name, as on create. `entityId` is still passed to `slugForEntity`, so the entity never collides with itself.

# Breaking changes

None.

# Checklist

📌 Always:
- [x] I have set a clear title
- [x] My PR is small and contains a single feature
- [x] I have [checked my own PR](## "Fix typo's and remove unused or commented out code")

👍 Most of the time:
- [x] I have added or updated test cases
- [ ] I have updated the README if needed

### Tests

`e2e/tests/regression/issue-5476-slug-generated-for-translation-added-on-update.spec.ts`: adding Polish to an existing collection generates and persists `kolekcja-5476-…` (fails on master — the slug input stays empty); renaming a translation that already has a slug leaves it alone. Ran locally with `--repeat-each=2`, plus `catalog/products`, `catalog/collections`, `catalog/translation-placeholders`, `regression/issue-4155` and `regression/issue-4327`.
