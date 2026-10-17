Bump `langchain-text-splitters` from 1.1.2 to 1.1.3. Changes since [1.1.2](https://github.com/langchain-ai/langchain/releases/tag/langchain-text-splitters%3D%3D1.1.2) are itemized below; dependency bumps and lockfile-only updates are excluded.

### Fixes

- Restore lazy imports for heavy optional dependencies, with import-isolation and missing-dependency regression coverage ([#35469](https://github.com/langchain-ai/langchain/pull/35469)).
- Raise a descriptive `TypeError` for unsupported `RecursiveJsonSplitter` inputs rather than silently returning an empty result; top-level lists require `convert_lists=True`, while `None` still returns `[]` ([#39238](https://github.com/langchain-ai/langchain/pull/39238)).
- Remove invalid or duplicate Kotlin, Rust, and Haskell separators ([#37039](https://github.com/langchain-ai/langchain/pull/37039)).
- Remove incorrect C# `implements` and Elixir `while` separators ([#37037](https://github.com/langchain-ai/langchain/pull/37037)).
- Avoid `None` metadata keys when `ExperimentalMarkdownSyntaxTextSplitter` has no header mapping ([#34545](https://github.com/langchain-ai/langchain/pull/34545)).
- Clarify the existing `HTMLHeaderTextSplitter.split_text_from_url` deprecation warning: fetch HTML separately and use `split_text` ([#37164](https://github.com/langchain-ai/langchain/pull/37164)).

### Tooling, packaging, and documentation

- Replace `mypy` with `ty` and refactor tokenizer/HTML helpers. Also fix `SentenceTransformersTokenTextSplitter` for models without a maximum token limit: honor explicit `tokens_per_chunk`, or raise a clear `ValueError` when omitted. Correct the GPT-4.1-mini encoding expectation to `o200k_base` ([#38658](https://github.com/langchain-ai/langchain/pull/38658)).
- Update the token-splitter integration-test model from GPT-3.5 Turbo to GPT-4.1-mini ([#38042](https://github.com/langchain-ai/langchain/pull/38042)).
- Tighten tokenizer/spaCy annotations and replace deprecated `load_module()` in the import-check script with module-spec loading ([#40085](https://github.com/langchain-ai/langchain/pull/40085), non-dependency changes only).
- Document existing support for `None` Markdown header names with a targeted type-checker suppression; no runtime change ([#40566](https://github.com/langchain-ai/langchain/pull/40566), non-dependency change only).

## References
- Slack thread: https://langchain.slack.com/archives/C0C5950ARJT/p1790955367956069

Made by [Open SWE](https://github.com/langchain-ai/open-swe) · [view thread](https://openswe.langchain.dev/agents/aadecb8c-db4f-537a-a174-fe630f165f81) · openai:gpt-6-astra (medium)
