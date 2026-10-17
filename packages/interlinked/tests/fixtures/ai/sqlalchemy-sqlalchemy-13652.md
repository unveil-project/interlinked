Fixes #13641

`logging_token` is stored by replacing `Connection._message_formatter`. That name is a class attribute (`None`) until a non-empty token assigns it on the instance. Clearing the token with `None` or `""` on a fresh connection, or connecting through an engine configured with `logging_token=None`, called `del` on an attribute that was not in the instance dict and raised `AttributeError`.

The reset now removes the instance override only when it is present, which is the same end state as the class default. The existing test that clears a token after one was set still passes.

```
pytest test/engine/test_logging.py::LoggingTokenTest -q -p no:xdist
```

Made with [Cursor](https://cursor.com)