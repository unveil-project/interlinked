### Summary

`Magika.identify_paths()` is documented and type-hinted to take a `Sequence[Union[str, os.PathLike]]`, and it explicitly raises `TypeError` for non-sequence input (`identify_paths(Path("x"))`). But a bare `str` passes the guard, because `str` *is* registered as a `collections.abc.Sequence`. The string is then iterated character by character, and the call silently returns one bogus `MagikaResult` per character instead of raising.

### Environment

- `main` @ `e6a4c8e` ("Expose the Rust library as a C library (#1449)")
- `python/` package version `1.0.3`, Python 3.13, macOS arm64

### Reproduction

```python
from magika import Magika

m = Magika()
results = m.identify_paths("code.py")   # note: missing brackets, a very common typo
print(len(results))
for r in results:
    print(repr(str(r.path)), r.status)
```

### Actual result

```
7
'c' Status.FILE_NOT_FOUND_ERROR
'o' Status.FILE_NOT_FOUND_ERROR
'd' Status.FILE_NOT_FOUND_ERROR
'e' Status.FILE_NOT_FOUND_ERROR
'.' Status.OK              <- resolves to the CWD, reported as `directory`
'p' Status.FILE_NOT_FOUND_ERROR
'y' Status.FILE_NOT_FOUND_ERROR
```

No exception, no warning.

### Expected result

`TypeError`, exactly like the sibling case that is already asserted in `python/tests/test_magika_python_module.py::test_api_call_with_bad_types`:

```python
with pytest.raises(TypeError):
    _ = m.identify_paths(Path("/non_existing.txt"))
```

### Root cause

`python/src/magika/magika.py:154`:

```python
if not isinstance(paths, Sequence):
    raise TypeError("Input paths should be of type Sequence[Path]")
```

`isinstance("code.py", collections.abc.Sequence)` is `True` (`Sequence` is registered for `str`), so the container guard passes. The per-element guard on the next lines then accepts each character, since every character is itself a `str`.

Note that the adjacent `bytes` case is caught only by accident: iterating `bytes` yields `int`, which the per-element guard rejects.

### Impact

A trivial caller typo (forgetting the list brackets) turns into silently wrong output rather than an error: the caller gets a list of `FILE_NOT_FOUND_ERROR` results whose length happens to equal the length of the path string, and — worse — the `"."` component is reported as a valid `directory` result with `Status.OK`. Any code that filters on `result.ok` will happily consume that garbage.

### Proposed fix

Exclude the string types from the container guard, `python/src/magika/magika.py:154`:

```python
if isinstance(paths, (str, bytes)) or not isinstance(paths, Sequence):
    raise TypeError("Input paths should be of type Sequence[Path]")
```

I have a fix plus a regression test added to the existing `test_api_call_with_bad_types` and will open a PR shortly.
