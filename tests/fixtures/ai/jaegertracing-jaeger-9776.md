## Which problem is this PR solving?

With multi-tenancy enabled and no tenant allow-list, any read or write carrying a previously unseen tenant created a per-tenant store with a ring preallocated to `max_traces` slots. That is about 8 MB at the all-in-one default of 100k, and about 76 MiB at the remote-storage binary's default of 1M. A small GET with a fresh tenant header therefore pinned that memory until restart.

## Description of the changes

- **Reads only look up.** The seven read paths (GetServices, GetOperations, FindSpans, FindTraces, FindTraceIDs paginated and not, GetTraces, GetDependencies) look the tenant up and return empty results for an unknown one. Only writes create tenants.
- **The ring grows lazily.** It doubles its backing array up to `max_traces` and then wraps, so a tenant costs memory in proportion to what it stores. Eviction order is unchanged.
- **Sentinel checks removed.** The ring can no longer hold unfilled slots, so the empty-ID checks that skipped them are gone.

Not changed:
- **The number of tenants is still uncapped for writes.** A cap would need a new config field, which I'd like a maintainer's view on.
- **Visibility timing:** a read resolves its tenant when the iterator is created. So a write to a brand-new tenant between creating and consuming the iterator is not visible to that iterator.

## How was this change tested?

- `TestReadsDoNotCreateTenants`: across all read paths, data is found for the writer's tenant, an unknown tenant gets empty results, and no tenant entry is created.
- `TestWriteGrowsRingWithTracesStored`: at `max_traces` 1,000,000, capacity tracks what was written.
- `TestRingEvictsOldestOnceFull`: wrap-around and eviction at the boundary.
- `make fmt`, `make lint` and `make test` pass.

## Checklist
- [x] I have read https://github.com/jaegertracing/jaeger/blob/main/CONTRIBUTING_GUIDELINES.md
- [x] I have signed all commits
- [x] I have added unit tests for the new functionality
- [x] I have run lint and test steps successfully: `make lint test`

## AI Usage in this PR (choose one)
See [AI Usage Policy](https://github.com/jaegertracing/jaeger/blob/main/AI_POLICY.md).
- [ ] **None**: No AI tools were used in creating this PR
- [ ] **Light**: AI provided minor assistance (formatting, simple suggestions)
- [ ] **Moderate**: AI helped with code generation or debugging specific parts
- [x] **Heavy**: AI generated most or all of the code changes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
