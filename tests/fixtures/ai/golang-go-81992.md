When rewriteFixedLoad folds a pointer load out of a read-only symbol,
it marks the loaded symbol as used in an interface if its name has the
"type:" prefix. That prefix also matches helper symbols such as
type:.eqfunc.*, which is what the Equal field of a type descriptor
points to. After inlining reflect.TypeFor[T]().Comparable() on a struct
needing a generated equality function, the load of Equal is folded and
the function gets an R_USEIFACE relocation against type:.eqfunc.*,
making the linker panic because the target is not a type or itab.

Add (*LSym).IsGoType, which reports whether a symbol is a type
descriptor by name: a "type:" symbol whose name does not continue with
".". Use it both in rewriteFixedLoad and in the object writer's
SymFlagGoType check, so the two cannot disagree.

Fixes #81990
