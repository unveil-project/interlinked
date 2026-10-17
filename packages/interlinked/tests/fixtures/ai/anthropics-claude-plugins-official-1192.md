## Bug Description

The Discord plugin's outbound reply/download functions intermittently fail with:
```
reply failed: channel <id> is not allowlisted — add via /discord:access
```

This happens even when the sender is properly allowlisted in `access.json`. The failure rate is roughly 50% — sometimes replies succeed, sometimes they fail, with no changes to configuration.

## Root Cause

In `server.ts`, `fetchAllowedChannel()` checks `ch.recipientId` to verify DM channel access:

```typescript
if (ch.type === ChannelType.DM) {
  if (access.allowFrom.includes(ch.recipientId)) return ch
}
```

`DMChannel.recipientId` in discord.js v14 can be `null` when:
- The channel was created as a partial (line 89: `partials: [Partials.Channel]`)
- The internal channel cache has been evicted
- `client.channels.fetch(id)` returns a channel object without the recipient populated

When `recipientId` is `null`, `Array.includes(null)` never matches any string in `allowFrom`, so the check always fails.

## Reproduction

1. Set up Discord plugin, approve a DM pairing
2. Send a message and reply immediately — usually succeeds (channel in cache)
3. Wait a few minutes, send another message — reply fails intermittently
4. Pattern: works right after inbound message, fails after cache eviction

## Environment

- discord.js v14
- Bun runtime
- macOS / Linux

## Fix

PR: #1191

Force a full channel fetch when `recipientId` is null and the channel is partial.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
