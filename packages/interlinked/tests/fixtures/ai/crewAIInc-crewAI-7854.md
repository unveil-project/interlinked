Adds three tools to crewai-tools so a CrewAI agent can drive a self-hosted Darkmoon (https://github.com/ASCIT31/Dark-Moon, GPL-3.0 autonomous AI pentest platform): DarkmoonRunPentestTool (start a campaign, optionally wait and return findings + severity stats), DarkmoonGetFindingsTool, DarkmoonListCampaignsTool.

They call the Darkmoon Dashboard API of an instance the user operates (DARKMOON_BASE_URL / DARKMOON_USERNAME / DARKMOON_PASSWORD env vars, JWT login, cached). There is no public hosted endpoint. Open source vs Pro is stated in the README: the engine/CLI are OSS, the dashboard API these tools use is Pro, and the Pro remediation-to-PR feature is deliberately not exposed.

Design notes: follows the existing requests-based tools (EnvVar, package_dependencies, args_schema); failures raise DarkmoonToolError; the run tool only reports a campaign created by that run (never a pre-existing one) and reports timed_out instead of looping forever.

Tests: 12 unit tests with a fake transport (login caching, bearer header, error detail surfacing without secrets, wait/poll, timeout, no-wait, stale campaign guard). Locally: pytest tests/tools/test_darkmoon_tool.py, test_generate_tool_specs.py, test_optional_dependencies.py pass; ruff check/format and mypy clean on the new package. Exports added to crewai_tools/__init__.py and tools/__init__.py (alphabetical).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_014HBQNzAf5C2E3MiJC48HQw

<!-- CURSOR_SUMMARY -->
---

> [!NOTE]
> **Medium Risk**
> Exposes agent-callable penetration-test orchestration against user-configured targets; misuse or misconfiguration could trigger offensive scans, though scope is limited to optional self-hosted credentials and documented authorized use.
> 
> **Overview**
> Adds **Darkmoon** integration to `crewai-tools` so agents can drive a **self-hosted** Darkmoon Dashboard API (JWT login via `DARKMOON_*` env vars or constructor fields).
> 
> New tools: **`DarkmoonRunPentestTool`** (start a campaign, optional wait/poll with timeout and `timed_out`, or fire-and-forget `run_id`), **`DarkmoonGetFindingsTool`**, and **`DarkmoonListCampaignsTool`**, plus **`DarkmoonToolError`**. Shared client handles auth caching, API errors, and run completion only attributes **new** campaigns (not pre-existing ones). Pro-only dashboard API and authorized-use warnings are documented in the new README.
> 
> Exports are wired in `crewai_tools/__init__.py` and `tools/__init__.py`. **12 unit tests** mock HTTP for login, polling, timeouts, and error handling.
> 
> <sup>Reviewed by [Cursor Bugbot](https://cursor.com/bugbot) for commit 5ef6c3a9015393c573e32dac0364fc4c7f3514e0. Bugbot is set up for automated code reviews on this repo. Configure [here](https://www.cursor.com/dashboard/bugbot).</sup>
<!-- /CURSOR_SUMMARY -->
