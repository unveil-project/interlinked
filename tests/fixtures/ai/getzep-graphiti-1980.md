## Summary

MMR normalizes candidate embeddings but previously used the query at its original magnitude. Scaling a query therefore changed the balance between relevance and diversity, and could discard every result at the default score threshold. For example, the same candidates return two matches for `[1.0, 0.0]` but none for `[0.7, 0.0]`. This also occurs through `Graphiti.search_` when the embedding client returns a shortened, non-unit vector.

Normalize nonzero query embeddings before scoring and preserve the existing zero-query behavior. Add regressions for ranking, scores, inclusive threshold filtering, zero vectors, and the search orchestration path. The existing redundancy calculation is preserved; this is separate from the selected-set MMR proposal in #1978.

Implementation, tests, and this description were prepared with Codex. Another Codex agent independently reviewed the change and reproduced the public-search behavior.

## Type of change

- [x] Bug fix
- [ ] Feature (linked Feature issue already has `rfc-approved`)
- [ ] Documentation
- [ ] Maintenance or refactor

## Related issue

Fixes #1979

## Design approval

- [x] This is not a feature pull request.
- [ ] The linked Feature issue has the `rfc-approved` label after discussion with the Graphiti team.

## Testing

- [x] Tests were added or updated for behavior changes.
- [x] `make check` passes with the documented no-database CI test selection, as detailed below.
- [ ] Tests are not applicable; the reason is explained below.

- New regressions on the original code: **5 failed, 3 passed**. The failures cover non-unit query ranking/scores/filtering and search results; unit and zero-query controls pass.
- Search test directory after the fix: **41 passed**.
- `make check`, with `PYTEST` set to the no-database CI selection documented in `AGENTS.md` and all four database-disable variables set: **613 passed, 12 skipped**; Ruff passes and Pyright reports **0 errors, 0 warnings**. Database/model integration tests were not run.
- A separate public `Graphiti.search_` reproduction using the real `OpenAIEmbedder` and SDK with mocked HTTP/database boundaries now returns the same matches and scores at both query magnitudes.

## Breaking changes

- [ ] This change affects an existing public API, data model, or deployment.

Function signatures and stored embeddings are unchanged. MMR relevance scores for non-unit queries now use normalized embeddings, so the configured weight and threshold no longer depend on query magnitude.

## Checklist

- [x] I opened or linked an existing issue before this pull request.
- [x] I reviewed my own changes.
- [x] The reranker docstring documents normalization for both relevance and diversity.
- [x] I did not commit secrets, credentials, customer data, or other sensitive information.
- [ ] I will complete the Contributor License Agreement when prompted.

Any required CLA signature remains a personal action for the account owner.
