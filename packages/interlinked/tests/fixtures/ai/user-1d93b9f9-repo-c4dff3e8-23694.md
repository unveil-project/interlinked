### Bug summary

The block CLI's JSON output interprets stored strings as Rich markup and emoji aliases. This changes the returned data, and a literal closing tag can make the command fail.

Reproduced on current main `da9d9dc15f`, Linux, Python 3.12.14, with an isolated local test server:

```python
from prefect.blocks.core import Block
from prefect.testing.cli import CycloptsCliRunner
from prefect.testing.utilities import prefect_test_harness

class LiteralData(Block):
    message: str

with prefect_test_harness():
    LiteralData(message="[bold]literal[/bold] :smile:").save("literal-data")
    result = CycloptsCliRunner().invoke(
        ["block", "inspect", "literaldata/literal-data", "-o", "json"]
    )
    print(result.stdout)
    print(f"exit_code={result.exit_code}")
```

The stored message is `[bold]literal[/bold] :smile:`, but JSON output contains `literal 😄`, with exit code 0. A message containing only `[/bold]` instead raises `rich.errors.MarkupError`.

The same behavior is reproduced in:
- `prefect block ls -o json`
- `prefect block inspect <slug> -o json` and lookup by `--id`
- `prefect block type ls -o json` for description/code-example fields
- `prefect block type inspect <slug> -o json` for metadata and schema descriptions

Expected: JSON should preserve the stored strings literally, while continuing to mask secret values.

### Verification and proposed scope

A private real-API/CLI regression matrix on unchanged source produced 18 failures for markup/closing-tag/emoji cases. Six plain-text controls and the existing inspect-secret-masking test passed. No external Prefect service or real user block was used.

I plan to disable markup and emoji parsing at the four JSON print calls in `src/prefect/cli/block.py`, retaining soft wrapping and adding behavior-focused regressions. This follows the existing CLI output contract and the narrow fixes in #23530 and #23692; it does not change global console behavior or human-readable tables.

AI assistance: Codex prepared and ran the reproductions and drafted this report. The behavior above was observed locally; no production fix is included in this issue.