Thanks @mmzeynalli — that last test is in (ed1f827).

The to-one fall-through now honours `__str__` like every other branch: `cell_value = None if formatted_value is None else str(formatted_value)`, so a related model with `__str__` exports its string form and a missing relation still exports as an empty cell (not the string "None").

Added `test_get_export_row_values_with_to_one_relationship` with `Book`/`Publisher` models — Publisher defines `__str__` returning its name, so the test pins `publisher` exporting as "P", plus the None case. Also verified no line exceeds 88 chars for ruff.
