Closes #36668

## What I did

Since #34808 the MDX indexer reads an explicit `id` off `<Meta>`: `analyze-mdx.ts` pulls it out of
the JSX attributes and `StoryIndexGenerator` uses it as the docs entry's id, so
`<Meta title="Example/Guidelines" id="example-guidelines" />` publishes at
`?path=/docs/example-guidelines--docs`. The `Meta` block's props type never gained it, though.
`MetaProps` is `BaseAnnotations & { of?: ModuleExports; title?: string }` and `BaseAnnotations`
declares no `id`, so a prop that works at runtime is a type error for anyone running `tsc` over
their docs files.

I added `id?: string` to `MetaProps`. That is the docs block's own props type; the CSF `Meta` used
in story files is `ComponentAnnotations`, which already declares `id?: ComponentId`, so it needed no
change. I also documented the prop on the Meta API reference page alongside the others.

## Checklist for Contributors

### Testing

#### The changes in this PR are covered in the following automated tests:

- [ ] stories
- [x] unit tests
- [ ] integration tests
- [ ] end-to-end tests

`Meta.test-d.ts` asserts that `ComponentProps<typeof Meta>['id']` is `string | undefined`. Without
the change the indexed access is a `TS2339` error, so the type test does not pass on its own.

#### Manual testing

1. In a project using `@storybook/addon-docs`, add a `.tsx` file containing:

   ```tsx
   import { Meta } from '@storybook/addon-docs/blocks';

   export const probe = <Meta title="Example/Guidelines" id="example-guidelines" />;
   ```

2. Run `tsc --noEmit`. On `next` it reports `TS2322` because `id` does not exist on the `Meta`
   props type; with this change it type-checks.
3. In an `.mdx` file, `<Meta title="Example/Guidelines" id="example-guidelines" />` still resolves
   to `?path=/docs/example-guidelines--docs`. Nothing about indexing or rendering changes, the type
   just stops rejecting a prop the indexer already honours.

### Documentation

- [x] Add or update documentation reflecting your changes
- [ ] If you are deprecating/removing a feature, make sure to update
      [MIGRATION.MD](https://github.com/storybookjs/storybook/blob/next/MIGRATION.md)

## Checklist for Maintainers

- [ ] When this PR is ready for testing, make sure to add `ci:normal`, `ci:merged` or `ci:daily` GH label to it to run a specific set of sandboxes.
- [ ] Declare whether manual QA will be needed through `qa:needed` or `qa:skip`.
- [ ] Make sure this PR has the `bug` label.

I used Claude as an assistant while writing this change.
