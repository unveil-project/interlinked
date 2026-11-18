## Bug

`prefect artifact ls --output json` (both latest and `--all`) and `prefect artifact inspect KEY --output json` pass serialized artifact records through Rich markup/emoji parsing. Stored data is silently changed, and a stray closing tag can make the command fail instead of returning JSON. This breaks scripts exporting artifact content.

On current main `2b76fb3da359c20fc5fa4e4db615a6fc76330b1e`, Linux/Python 3.12, real repository SQLite/API fixtures reproduced:

- data `[red]literal[/red]` → `literal`
- data `:smile:` → an emoji
- data `literal [/unexpected]` → `rich.errors.MarkupError`
- nested data, description, and metadata strings are also interpreted.

Minimal reproduction against a local test server:

```python
import asyncio
from prefect.client.orchestration import get_client
from prefect.client.schemas.actions import ArtifactCreate

async def create():
    async with get_client() as client:
        await client.create_artifact(ArtifactCreate(
            key="literal-artifact", type="markdown", data="[red]literal[/red] :smile:"
        ))

asyncio.run(create())
```

Then run `prefect artifact inspect literal-artifact --output json` and compare the `data` value with the submitted string; repeat with `artifact ls --output json` / `artifact ls --all --output json`.

## Scope and planned fix

I am preparing a focused two-call fix: disable markup and emoji interpretation only in the artifact JSON output paths, retaining `soft_wrap=True`, with real API/CLI round-trip regression tests for all three command forms. Human-readable output is unchanged. This follows the existing CLI contract and the variable-command fix in #23530, which explicitly excluded other commands; it is not a competing variable fix or a global console change.

Local reproduction: 18 parametrized cases fail on unmodified main (data/description corruption or the closing-tag crash), including nested content and long/Unicode controls with literal metadata. Initial test setup needed a writable PREFECT_HOME; no product failure was inferred from that setup error.

AI assistance: Codex investigated and ran these reproductions and is preparing the focused fix/tests with independent review. No production service or private data was used.