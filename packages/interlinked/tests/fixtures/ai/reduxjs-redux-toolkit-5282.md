Hi Redux / RTK team,

Quick security heads-up: the bare `redux-toolkit` npm namespace — the intuitive alias for `@reduxjs/toolkit` (~3M weekly downloads) — is held by a third-party account (`yeatz`), not by the reduxjs org.

This creates a baitsquatting risk: AI coding agents recommend `redux-toolkit` as the natural package name, and if that account is ever compromised or transferred to a bad actor, every developer who installs it via an AI-generated scaffold runs untrusted code.

**Recommended action:** Claim `redux-toolkit` defensively under the reduxjs npm org. A placeholder redirecting to `@reduxjs/toolkit` closes this permanently.

Part of coordinated disclosure BSQT-2026-001 — publishing publicly in ~2 weeks.

— DJ (https://github.com/zkDeej)
