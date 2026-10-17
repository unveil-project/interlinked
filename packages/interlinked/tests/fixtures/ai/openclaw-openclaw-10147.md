## Description

The documentation at `docs/channels/mattermost.md` instructs users to install the Mattermost plugin via:

```bash
openclaw plugins install @openclaw/mattermost
```

However, this package does not exist on npm:

```
npm error 404 Not Found - GET https://registry.npmjs.org/@openclaw%2fmattermost - Not found
```

## Workaround attempted

Installing from the local extension path works partially:

```bash
openclaw plugins install ./extensions/mattermost
```

But fails at runtime because the plugin uses `workspace:*` dependencies in its `package.json`, which only resolve within the monorepo context.

## Expected behavior

Either:
1. Publish `@openclaw/mattermost` to npm with bundled dependencies
2. Or update the documentation to reflect the current installation method

## Environment

- OpenClaw version: 2026.2.2-3
- OS: Debian 13
- Node: v22.22.0
