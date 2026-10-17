## Related issue

Fixes #7846.

## Summary

Walk DOCX paragraphs and tables in document order, including nested tables, and preserve row/cell boundaries in the extracted text. Merged cells are emitted only once per table. Table-only documents now produce searchable content; paragraphs, source references and the metadata shape remain compatible. Existing loader tests use real document objects so they exercise the parser’s block traversal.

## Verification

- [x] Tests added or updated for the changed behavior
- [x] Relevant tests and quality checks pass locally

Six generated DOCX fixtures failed before the original fix: table-only, mixed paragraph/table order and nested tables, each through local-file and mocked-HTTP loading. Six additional regressions reproduce horizontal, vertical and rectangular merged-cell duplication through both local-file and mocked-HTTP loading. The loader now visits each underlying cell once per table, preserving nested content and identical text in distinct cells; all twelve fixture cases pass.

On this independent branch, the complete `lib/crewai-tools/tests/rag` suite passes: **151 tests**, using Python 3.13.15. Ruff, formatting, targeted mypy (`--follow-imports=silent`) for the changed loader, and `git diff --check` pass. No live provider credentials or requests are needed.

## Additional context

AI-generated contribution: investigated, implemented and verified with Codex. The required `llm-generated` label was requested when creating the linked issue, but GitHub omitted it; an explicit add-label operation was denied because this account lacks repository labeling permission. Maintainers: please apply `llm-generated` to this PR and its issue.

<!-- CURSOR_SUMMARY -->
---

> [!NOTE]
> **Low Risk**
> Scoped to DOCX text extraction in crewai-tools RAG; behavior change is additive for table content with broad test coverage and no auth or data-pipeline changes.
> 
> **Overview**
> Fixes DOCX RAG ingestion so **table text is included**, not only body paragraphs. `DOCXLoader` now walks `iter_inner_content()` via a new `_iter_text` helper that yields paragraphs and tables in document order, formats each table row as pipe-separated cells, recurses into nested tables/cell content, and deduplicates merged cells by underlying `CT_Tc` so repeated grid slots are not emitted twice.
> 
> Loader metadata and `LoaderResult` shape stay the same; extracted `content` can now include table rows (and table-only docs become searchable). Tests switch from shallow mocks to real `python-docx` fixtures, and add parametrized coverage for mixed/nested layouts, merged cells, and both file and mocked-URL loading paths.
> 
> <sup>Reviewed by [Cursor Bugbot](https://cursor.com/bugbot) for commit 9113be9767562677a255cda918cc158d4823512b. Bugbot is set up for automated code reviews on this repo. Configure [here](https://www.cursor.com/dashboard/bugbot).</sup>
<!-- /CURSOR_SUMMARY -->

### CI dependency audit

The original `pip-audit` failure came from `pypdf==6.16.2` in the base dependency set. This branch now includes upstream main `8078f913`, including the maintainer-merged dependency upgrade in #7851 (`pypdf==6.19.0`). The updated branch’s [pip-audit check](https://github.com/crewAIInc/crewAI/actions/runs/36950042992/job/110660800094) now passes. No PR-specific dependency changes were added.
