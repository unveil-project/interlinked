## Summary

`MDXLoader` applied its import/export, JSX-tag and blank-line cleanup to the whole document, so any of that syntax appearing inside literal code was removed:

- a fenced block lost `import json`, and `assert 0 < count and count > 2` became `assert 0  2`
- inline code lost type parameters, e.g. `` `List<T>` `` became `` `List` ``
- tilde fences and longer backtick fences were not recognised at all
- blank lines inside a fence were collapsed

## Fix

Split the document into code and prose before cleaning:

- fenced blocks (backtick or tilde, any length, with a matching closing fence) are kept verbatim; an unterminated fence is treated as code to end of document
- inline code spans are kept verbatim (a run of backticks closed by a run of the same length)
- the MDX cleanup (import/export, JSX tags, blank-line collapse) runs only on prose
- backticks inside a JSX tag attribute are not treated as Markdown inline code

## Tests

Added regression tests in `lib/crewai-tools/tests/rag/test_mdx_loader.py`:

- fenced code keeps `import json` and comparisons
- inline code keeps `<T>` / `<div>`
- tilde fences and 4-backtick fences are preserved
- blank lines inside a fence are preserved
- MDX syntax outside code is still removed
- a fenced block surrounded by real MDX

All 21 tests in the file pass. Reverting the change makes 8 of the new tests fail.

Fixes #7977

---

**AI disclosure:** this change was prepared with an AI coding assistant. Repository policy asks for the `llm-generated` label on such contributions; I do not have permission to apply labels myself, so I am noting it here for a maintainer to apply.
