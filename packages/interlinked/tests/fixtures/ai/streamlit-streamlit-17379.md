## Describe your changes

The CCv2 fallback in the `developing-with-streamlit` agent skill said not to build custom components for "features that exist in newer Streamlit versions ... — suggest upgrading instead." The skill ships with Streamlit, so the common case is a native command that already exists in the installed version and that the agent should find. The sentence now says to check `references/api-reference.md` for a native command first, and to suggest upgrading only when that command is newer than the app's installed Streamlit. The examples now include `st.menu_button`, which the skill routes one-shot action menus to.

No agent-eval task covers this, so there is no before/after eval run.

## GitHub Issue Link (if applicable)

None.

## Testing Plan

- Explanation of why no additional tests are needed: markdown only. No test asserts on reference content.
- `ruff format --check` (which also formats code blocks in markdown) and the pre-commit hooks pass on the changed files.

---

**Contribution License Agreement**

By submitting this pull request you agree that all contributions to this project are made under the Apache 2.0 license.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
