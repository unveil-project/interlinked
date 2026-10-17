The ES|QL `ROUND` description does not say how a value halfway between two results is rounded. It is rounded away from zero, as `Maths.round` does: on 9.1, `ROUND(2.5)` returns `3.0`, `ROUND(-2.5)` returns `-3.0`, `ROUND(25, -1)` returns `30`. This differs from `Math.Round` in .NET and `round` in Python, which round to the nearest even number.

The sentence is added to the `@FunctionInfo` description, and the generated docs are regenerated with `RoundTests`.
