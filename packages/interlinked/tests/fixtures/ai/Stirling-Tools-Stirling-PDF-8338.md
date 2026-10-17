## Current state

Linking a self-hosted instance to a Stirling account is meant to work out of the box, but the released `stirlingtools/stirling-pdf:latest` (3.0.2) cannot link without extra configuration. Both halves are wrong:

| Baked into the image | 3.0.2 | This PR |
|---|---|---|
| Supabase URL and publishable key (frontend) | missing | present |
| `VITE_SAAS_API_URL` (frontend) | missing | `https://api2.stirling.com` |
| `stirling.billing.account-link.saas-base-url` default | `https://stirling.com/app` | `https://api2.stirling.com` |
| `stirling.billing.account-link.metering.enabled` default | off | on |

## Problem

- `docker/embedded/Dockerfile` declares `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` and `VITE_SAAS_API_URL` as empty build args. Docker puts every ARG into the `RUN` environment, empty ones included, and Vite lets any `VITE_*` in `process.env` beat the `.env` files, so the empty args blanked the committed production values. The "export only when non-empty" guard never had any effect. The fat and ultra-lite Dockerfiles declare no such args, so only the standard image was affected.
- The compiled-in SaaS base, `https://stirling.com/app`, answers `/api/v1/*` with the web app's HTML, so every register, entitlement and sync call from a stock image fails. Dev never hit it because `app/.env.proprietary` set `api2.stirling.com`, and previews set it through `SAAS_API_BASE_URL`.
- Cloud metering defaulted off, so a linked stock instance billed nothing to its team's wallet.

## Solution

Production Stirling is the default everywhere. The properties stay as overrides (`test_cicd.yml` and previews still turn things off).

- Dockerfile: unset the empty args instead of exporting the non-empty ones, so an empty arg falls back to the committed `frontend/editor/.env*` values.
- `AccountLinkProperties`: `saasBaseUrl` defaults to `https://api2.stirling.com` and `metering.enabled` to `true`. `UsageMeterService` gets `matchIfMissing = true` so the bean agrees with the field default; `UsageMeterServiceConditionTest` pins the two together.
- `app/.env.proprietary` drops the three values that duplicated the intended defaults, so dev runs what ships.
- `frontend/editor/.env.proprietary` drops `VITE_SAAS_SUPABASE_*`, which nothing reads.
- PR preview workflow: one API base for both halves, falling back to `api2.stirling.com`. The `pr-preview` environment already sets `SAAS_API_BASE_URL` to that, so previews are unchanged.

Behaviour change: once linked, a stock instance meters billable work (AI, API, automation) to the team's wallet. Unlinked instances are unaffected; the local free tier was already on.

## How to test

Build the standard image with no build args and run it with no env vars. Build from a clean checkout: untracked `frontend/editor/.env*.local` files are copied into the build context and would override the defaults.

```bash
docker build -f docker/embedded/Dockerfile -t stirling-pdf:link-test .
docker run --rm -p 8088:8080 stirling-pdf:link-test
```

1. Sign in as the first-run admin, open Settings > Account connection and click Connect.
2. Approve on stirling.com. It should return to `/account-link/callback` and show the server as linked.

Done so far: built this branch's image with no build args. Its bundle contains the production Supabase URL, key and `api2.stirling.com`, the proprietary jar defaults to `api2.stirling.com`, and the container starts and reaches `https://api2.stirling.com/api/v1/info/status`. The same bundle and jar checks fail against 3.0.2. Steps 1 and 2 have not been run end to end yet.

`:proprietary:test` passes apart from `FolderIdentitiesTest`, which cannot create a symlink on Windows without privilege (unrelated). `env.test.ts` and `task pre-commit` pass.


<!-- This is an auto-generated comment: release notes by coderabbit.ai -->

## Summary by CodeRabbit

* **Configuration**
  * Account-linked deployments now use the hosted Stirling API by default, with a configurable override. Frontend and backend settings use the same API address.
  * Usage metering is enabled by default for linked instances; it can still be disabled through configuration.
  * Embedded builds can use the provided production defaults when optional build settings are left empty.
* **Documentation**
  * Updated setup guidance clarifies how to configure an alternate SaaS address and matching Supabase project settings.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->