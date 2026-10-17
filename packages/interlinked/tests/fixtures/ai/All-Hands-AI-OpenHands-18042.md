<!-- Keep this PR as draft until it is ready for review. -->

HUMAN:

<!-- Human contributors: add a short note about your testing. -->

---

AGENT:

Written by an AI agent (OpenHands) on behalf of the user. Implements the **server-side cache** half of OpenHands/OpenHands#18029: the runtime-injected `index.html` (which carries `window.__AGENT_CANVAS_LOCK_TO_CLOUD__`) is now served with `Cache-Control: no-store` whenever runtime config is injected, so no intermediate proxy/CDN can ever hand the browser a stale document stripped of the locked-cloud backend config. Complements the client-side recovery-path change in #18038 (which reclassifies the "locked Cloud unresolved" case when the runtime signal *is* present).

Evidence: `npx vitest run __tests__/scripts/static-server.test.ts` — 60/60 passing, incl. new regression tests. Full suite: `npm test` — 779 files / 8227 tests passing.





## Why

On a locked-to-cloud deployment (`static-server.mjs --lock-to-cloud <host> --base-path /canvas`), the runtime-injected `index.html` encodes the backend config the UI needs (`window.__AGENT_CANVAS_LOCK_TO_CLOUD__`). If an intermediate proxy/CDN serves a stale cached copy of that document (the current header is `no-cache`, which permits storage + revalidation), the injected global is missing,, the backend registry resolves to the `no-backend` sentinel,,and the UI shows the terminal **"No agent server backend is configured yet. Add a backend to get started."** and blocks conversations — even though a healthy backend is configured.

Per the triage note on #18029, when the window global is absent there is **no durable client-side signal** that the deployment is locked-to-cloud (neither `VITE_LOCK_TO_CLOUD` nor `__AGENT_CANVAS_LOCK_TO_CLOUD__` is present), so the only robust fix for that trigger is to guarantee the document carrying the signal is never served stale — i.e. direction (b) (strict no-cache headers) rather than direction (a) (client-side reclassification, which cannot distinguish the case) or (c) (a full cache-busting/version check, which is heavier than needed).

## Summary

- `scripts/static-server.mjs`: serve the injected `index.html` with `Cache-Control: no-store` whenever **any** runtime config is injected (session key,, auth flag,, runtime-services info,, lock-to-cloud URL,, base path,, vscode editor prefix,, telemetry opt-out) —previously `no-store` was only used when a session key was present, with everything else `no-cache`.
- Plain (non-injected) `index.html` fallback keeps `Cache-Control: no-cache`, so the change is scoped to documents that embed deployment config.



- Tests: updated the existing "other config injected" header expectation to `no-store`; added a regression test asserting lock-to-cloud `index.html` is `no-store`; added a test asserting a non-injected `index.html` remains `no-cache`.

## Issue Number

Fixes #18029

## How to Test

```bash
npm ci
npm run make-i18n
npx vitest run __tests__/scripts/static-server.test.ts
npm test          # full suite (779 files,, 8227 tests,, 7 todo)
```

Manual (any static deployment):
1. `node scripts/static-server.mjs --dir build --lock-to-cloud https://app.example.com --base-path /canvas`
2. `curl -sI http://127.0.0.1:3001/canvas/ | grep -i cache-control` → `cache-control: no-store`
3. Serve without injection:`node scripts/static-server.mjs --dir build` and `curl -sI http://127.0.0.1:3001/ | grep -i cache-control` → `cache-control: no-cache`

## Video/Screenshots

Reproduction evidence for the bug requires a stale cache entry behind a misbehaving intermediate cache; the deterministic, CI-covered proof of the fix is the new header assertions (tests above): the injected document now carries `no-store`, so it cannot be stored by a proxy/CDN.



## Design Doc

N/a — a small, targeted header change.

@all-hands-bot can click here to [continue refining the PR](https://app.all-hands.dev/canvas/conversations/dd6b9211-3d39-4201-9cdf-22df5609823f)
<!-- AGENT_CANVAS_DOCKER_START -->
---
**🐳 Docker images for this PR**

• **GHCR package:** https://github.com/OpenHands/OpenHands/pkgs/container/agent-canvas

| Component | Value |
|---|---|
| **Image** | `ghcr.io/openhands/agent-canvas` |
| **Architectures** | amd64, arm64 |
| **Agent Server** | `ghcr.io/openhands/agent-server:1.53.0-python` |
| **Automation** | `openhands-automation==1.18.0` |
| **Commit** | `7c99d01a75f80fef015f39c633c3342ba52f1bd1` |

**Pull (multi-arch manifest)**
```bash
# Multi-arch manifest — Docker automatically pulls the correct architecture
docker pull ghcr.io/openhands/agent-canvas:sha-7c99d01
```

**Run**
```bash
docker run -it --rm \
  -p 8000:8000 \
  ghcr.io/openhands/agent-canvas:sha-7c99d01
```

**All tags pushed for this build**
```
ghcr.io/openhands/agent-canvas:sha-7c99d01-amd64
ghcr.io/openhands/agent-canvas:openhands-fix-locked-cloud-stale-index-cache-amd64
ghcr.io/openhands/agent-canvas:pr-18042-amd64
ghcr.io/openhands/agent-canvas:sha-7c99d01-arm64
ghcr.io/openhands/agent-canvas:openhands-fix-locked-cloud-stale-index-cache-arm64
ghcr.io/openhands/agent-canvas:pr-18042-arm64
ghcr.io/openhands/agent-canvas:sha-7c99d01
ghcr.io/openhands/agent-canvas:openhands-fix-locked-cloud-stale-index-cache
ghcr.io/openhands/agent-canvas:pr-18042
```

**About Multi-Architecture Support**
- Each tag (e.g., `sha-7c99d01`) is a **multi-arch manifest** supporting both **amd64** and **arm64**
- Docker automatically pulls the correct architecture for your platform
- Individual architecture tags (e.g., `sha-7c99d01-amd64`) are also available if needed
<!-- AGENT_CANVAS_DOCKER_END -->