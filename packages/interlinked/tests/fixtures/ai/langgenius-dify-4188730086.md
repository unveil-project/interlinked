Pushed a fix for the CI failures in `test_notion_provider.py`. The three existing `_read_table_rows` tests used `Mock(json=lambda: data)` without setting `status_code`, so the new HTTP status check was triggering on the mock objects. Updated the mocks to include `status_code = 200`.

The other failing tests in the CI run (`test_pause_resume`, `test_knowledge_retrieval_node`, etc.) are unrelated to this PR — they appear to be pre-existing failures on the base branch.
