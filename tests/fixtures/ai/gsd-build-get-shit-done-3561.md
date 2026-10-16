# /gsd-ultraplan-phase runtime gate checks an env var Claude Code never sets

## Repro

In any Claude Code session (any version):

```
/gsd-ultraplan-phase
```

Always errors with:

```
RUNTIME ERROR
/gsd:ultraplan-phase requires Claude Code.
ultraplan is not available in this runtime.
```

## Root cause

`get-shit-done/workflows/ultraplan-phase.md` line 32 checks `$CLAUDE_CODE_VERSION`:

```bash
echo "$CLAUDE_CODE_VERSION"
```

Claude Code does **not** export that variable. The actual env signals it sets are:

- `CLAUDECODE=1`
- `CLAUDE_CODE_ENTRYPOINT=cli` (or `vscode`, etc.)
- `CLAUDE_CODE_EXECPATH=…`
- `CLAUDE_CODE_SESSION_ID=…`

So the gate always fails closed, and the workflow exits before reaching `initialize`. Confirmed on Claude Code `2.1.139`.

## Fix

Use one of the existing signals, and read the version from `claude --version` if needed for the v2.1.91+ floor:

```bash
if [ "$CLAUDECODE" = "1" ] || [ -n "$CLAUDE_CODE_ENTRYPOINT" ]; then
  CC_VERSION="$(claude --version 2>/dev/null | awk '{print $1}')"
  echo "claude-code:${CC_VERSION:-unknown}"
else
  echo ""
fi
```

Happy to send a PR if useful.
