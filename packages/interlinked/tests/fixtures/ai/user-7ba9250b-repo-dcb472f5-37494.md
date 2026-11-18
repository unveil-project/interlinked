## Current Behavior

`create-nx-workspace --aiAgents=none` is ignored when the workspace is created from a template. With an AI agent detected, presets such as `ts` are mapped to a template (`OPENCODE=1 npx create-nx-workspace example --preset=ts --aiAgents=none`). The downloaded template already contains agent files, and they are left in the workspace: `.agents/`, `.claude/`, `.codex/`, `.cursor/`, `.gemini/`, `.opencode/`, `opencode.json`, `CLAUDE.md`, the Nx section in `AGENTS.md`, and Copilot files under `.github/`.

## Expected Behavior

Passing `--aiAgents=none` adds no AI agent files in the template flow either. CI workflows under `.github/workflows` stay, because they are not agent configuration. Omitting the flag still keeps the agent files the template ships.

## Related Issue(s)

Fixes #37437
