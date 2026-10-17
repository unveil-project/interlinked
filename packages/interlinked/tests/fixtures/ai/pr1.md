Housekeeping pass after #24-#27 all merged this session. No code changes, STATUS.md only.

Moves four items from Known gaps to What's done:
- Pinned black upgraded 23.3.0 -> 26.5.1, repo-wide reformat applied (#24)
- GitHub Copilot model metadata verified live against a real Free account's /models endpoint, 24 entries added for currently-served models litellm doesn't have data for (#25)
- scipy/numpy universal-compile conflict fixed, old hand-patch splice hack removed (#26, closes issue #18)
- MCP remote HTTP auth (bearer token / API key via .mcp.json headers) added and verified against a real server enforcing real 401s (#27)

Narrows the remaining MCP gap to just resources/prompts (auth is done), with the scoped follow-up noted -- new `/mcp-resources`, `/mcp-prompts` slash commands, since those primitives aren't callable functions like tools and need their own user-facing surface.

Docker Hub gap reframed from "not configured" to "intentionally left to the user," with real instructions:
- Build-it-yourself path (verified correct against `docker/Dockerfile`'s actual `WORKDIR`/`ENTRYPOINT`/`HOME` -- works today, zero setup)
- How a fork maintainer can turn on publishing to their own Docker Hub (`docker-release.yml` already exists and just needs `DOCKERHUB_USERNAME`/`DOCKERHUB_PASSWORD` secrets + either a version tag or manual `workflow_dispatch`)