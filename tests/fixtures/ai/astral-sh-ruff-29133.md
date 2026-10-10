## Summary

We now reject type-variable defaults that reference an out-of-scope or later type variable through an alias, using the same scope and ordering rules as direct references.

```python
type Items[T] = list[T]

def outer[T]():
    def inner[U = Items[T]](): ...  # Error: T is bound in an outer scope
```

The check preserves valid defaults whose alias arguments are unused or erased by specialization, and ignores variables bound by nested callable signatures. We also apply the outer-scope check to parameter lists used as `ParamSpec` defaults.

Builds on #29132 and uses its free-type-variable traversal, including its existing limitation for occurrences exposed only after growing recursive alias references.
