Fixes #13957

On Python 3.10, defining a model with a string (forward-ref) annotation raised:

```
TypeError: ForwardRef.__init__() got an unexpected keyword argument 'is_class'
```

`typing.ForwardRef` only gained the `is_class` parameter on newer interpreters, but `_type_convert()` passed it unconditionally.

`_type_convert()` now falls back to constructing the `ForwardRef` without `is_class` when the interpreter rejects the argument, keeping the intended `is_argument=False` behaviour.

Added a regression test that swaps in a `ForwardRef` without `is_class` support; it fails on the previous revision with the reported `TypeError`.
