### Bug summary

The variable CLI renders serialized JSON as Rich markup and emoji aliases. This silently changes stored values in `variable get`, `variable inspect --output json`, and `variable ls --output json`; an unmatched closing tag raises `rich.errors.MarkupError`.

### Reproduction

Against a local Prefect server, create a variable with a literal value such as `[red]literal[/red]`, `:smile:`, or `literal [/unexpected]`, then read it with each command above.

A minimal regression using the existing test fixtures (an async fixture is needed because the CLI runner itself starts an event loop):

```python
import json
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from prefect.server.models.variables import create_variable
from prefect.server.schemas.actions import VariableCreate
from prefect.testing.cli import invoke_and_assert

pytestmark = pytest.mark.clear_db

@pytest.fixture
async def literal_variable(session: AsyncSession):
    await create_variable(
        session, VariableCreate(name="literal_value", value="[red]literal[/red]")
    )
    await session.commit()

def test_variable_value_round_trips(literal_variable):
    result = invoke_and_assert(["variable", "get", "literal_value"], expected_code=0)
    assert json.loads(result.stdout) == "[red]literal[/red]"
```

Expected: the decoded output equals the stored value.

Actual: `"literal"` instead of `"[red]literal[/red]"`. Likewise `:smile:` becomes an emoji. Nested values are affected too. `literal [/unexpected]` raises a Rich markup error.

### Verification

Reproduced on main commit a0cb644eb9c937b5e78c957ea06c39d4f5c59093, Python 3.12.14, with locked project dependencies in an isolated environment. A 12-case real CLI/API regression matrix (three commands by four values including nested JSON) failed for these exact reasons. The existing variable CLI suite passes 20/20; collection utility tests pass 122/122. These are local tests, not tests against Prefect Cloud.

### Proposed scope

I plan a focused fix to disable markup and emoji processing only for these three serialized-JSON print calls, and use soft_wrap=True to avoid terminal-width line breaks in get output. Human-readable tables and global console behavior would remain unchanged. Regression tests will assert exact decoded values, including long strings and nested content.

Related to the machine-readable CLI goal in #19903. Searches for variable CLI JSON, markup and emoji issues/PRs did not find this specific bug.

AI disclosure: this investigation, reproduction and proposed contribution are being prepared with OpenAI Codex assistance; the reported checks were actually executed locally.