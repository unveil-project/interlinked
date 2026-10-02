## TLDR

Problem this solves:
- Lens still uses another product's name internally
- Deployment files include unrelated QA screenshots

How it solves it:
- Rename Lens code, APIs, worker imports, and database tables
- Preserve saved data with a rerunnable schema-only migration
- Block unsafe db-push upgrades until the rename is applied
- Update split-backend routing and CI test selection
- Remove eight deployment screenshots

Intentional product change: Lens APIs move from `/engine` to `/lens`; list responses use `lenses`, and worker claims use `lens_id`. Existing API clients and workers must upgrade with the proxy

## User Flow

Before: Lens API clients use the old product name

1. Open `/ui/lens/` and connect a worker
2. API clients call `/engine` to manage investigations

After: Lens uses its own name throughout setup and execution

1. Open `/ui/lens/` and connect the matching worker
2. API clients call `/lens` to manage investigations
3. Existing db-push installations apply the rename SQL before restarting

## Validation

Full local `make check` passes after the review fixes. All 16 Postgres migration/repository checks pass, covering all three db-push entrypoints, each legacy table, fresh setup, restart, and replay of the migration. The combined migration and extras suite passes 90 tests, and all 10 component-allowlist tests pass. The two added search-path cases fail on the previous SQL and pass with the fix, retaining saved run associations through migration replay. A clean environment installing only the extras package receives its database driver automatically and passes both fresh-schema and legacy-schema safety checks. `uv lock --check` passes. Earlier validation passed all 100 existing Lens unit tests and 26 dashboard tests. All four HTTP billing/privacy cases also pass, including disconnect cancellation. Existing test assertions were preserved while updating names; one new regression verifies saved findings, history, worker credentials, and billing assignments survive the actual migration

The published worker image is pinned by digest in setup and Compose, and was pulled successfully. The standalone Docker image passes non-root/read-only imports and temporary-storage recovery. A real Docker investigation completed against local request logs, screening one selected request and returning a finding. This is a naming/transport check, not a claim of large-scale analysis quality

## Screenshots / Proof of Fix

Use a disposable PostgreSQL schema with the legacy Lens tables and a saved run. Put another empty schema first in `search_path`, then execute the rename SQL and query `SELECT id, lens_id FROM "LiteLLM_LensRun"`

### Before (ed19330c65)

1. Execute that revision's migration with the empty schema first
2. Querying the saved run fails: `ERROR: column lens_id does not exist`

### After (17a97f8cbf)

1. Execute the updated migration with the same search path
2. Querying the saved run returns `('saved-run', 'saved-lens')`
3. Execute the migration again and query: the same saved run association remains intact

The proxy's earlier real-inference validation returned HTTP 200 through `/lens/worker/{lens_id}/{job_id}/model`, with matching Lens and virtual-key spend, and rejected blocked, exhausted, model-restricted, and deleted keys. A published worker completed a one-request investigation. Those inference checks predate this commit; the latest checks exercise migration and dependency fixes against real PostgreSQL

## Caveats

### Severe

- Coordinate proxy, worker, and API-client upgrades
- Stop workers after scans finish; upgrade proxy instances together
- Old worker images and `/engine` clients cannot use renamed APIs
- Existing db-push installations must apply the rename SQL first

### Low

- CI and automated reviews are pending
- One initial scan hit local ClickHouse memory limits
- Historical migration names remain unchanged to preserve migration checksums

The docs guide was updated in merged BerriAI/litellm-docs#1971. The db-push upgrade instructions are in `deploy/lens/README.md`

<!-- CURSOR_SUMMARY -->
---

> [!NOTE]
> **High Risk**
> Breaking API and database rename requires coordinated proxy, worker, and client upgrades; incorrect migration order or mixed versions can block startups or strand scans, though db-push guards and in-place SQL mitigate data loss.
> 
> **Overview**
> **Breaking rename:** Lens moves off the internal “engine” name end-to-end—HTTP surface **`/engine` → `/lens`**, list payloads use **`lenses`**, worker claims use **`lens_id`**, and the Python package is **`litellm/proxy/lens`** (worker module **`lens.worker`**). Proxy routing, backend allowlists, OpenAPI snapshot, and dashboard (`lensData`, `LensView`, etc.) follow the same paths and field names.
> 
> **Data and deploy:** Prisma/Postgres objects become **`LiteLLM_Lens`**, **`LiteLLM_LensRun`** (`engine_id` → `lens_id`), and **`LiteLLM_LensWorker`**, with migration **`20261001100000_rename_lens`** renaming legacy tables in place. **`prisma db push`** now calls **`raise_if_lens_rename_pending()`** (proxy + extras) so existing **`LiteLLM_Engine*`** data is not dropped; **`litellm-proxy-extras`** adds **psycopg** for that check. Lens worker Docker/Compose images and CI path filters point at the new package; upgrade notes are in **`deploy/lens/README.md`**.
> 
> Tests and integration suites are retargeted to **`/lens`** and the new table names, with added coverage for migration replay and db-push refusal on legacy schemas.
> 
> <sup>Reviewed by [Cursor Bugbot](https://cursor.com/bugbot) for commit 17a97f8cbf973717f2015ba4f1a156ac165c7b24. Bugbot is set up for automated code reviews on this repo. Configure [here](https://www.cursor.com/dashboard/bugbot).</sup>
<!-- /CURSOR_SUMMARY -->

