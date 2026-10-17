Custom components can opt into controls for children content with `Interactive.childrenSchema`, without adding `children` to `Interactive.baseSchema`. The fragment currently edits string children, while its exported field type and documentation leave room for richer content. Components that require string-only input can declare an explicit `type: 'string'` field. `Interactive.textSchema` continues to control typography.

Adds `type: 'string'` as the preferred field type and retains `text-content` as a deprecated alias with the same editor, source-saving, runtime-value, and keyframe behavior. Migrates built-in schemas, existing content, templates, and public skills to the new names. Documents both additions for v4.0.535, uses `React.ReactNode` in children fragment examples, and describes nested markup and computed children as currently read-only.

Closes #11823.

Validation:
- `bun run build` passed.
- `bun run stylecheck` passed.
- 110 existing tests passed across schema helpers, inspector fields, keyframe behavior, annotations, and JSX source edits.
- Docs preview-card generation and skill synchronization/link checks passed.
- No tests, fixtures, or snapshots added or modified.

## Preview

- [Interactive](https://remotion-git-codex-string-children-schema-remotion.vercel.app/docs/interactive)
- [InteractivitySchema](https://remotion-git-codex-string-children-schema-remotion.vercel.app/docs/interactivity-schema)
