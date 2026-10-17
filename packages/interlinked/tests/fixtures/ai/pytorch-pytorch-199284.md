
With enable_trace_load_build_class, Dynamo builds a class by calling the
real __build_class__, so the closure of the class body has to be turned
into real cell objects. _get_function_impl read the contents of every cell
while doing that. CPython only needs the cell itself; it reads the contents
when a method runs. So any method referring to a name that is bound after
the class statement (the class itself, or a local assigned later) hit
"Read uninitialized cell" (gb0091). This is shared root cause 2 in #195901.

For an empty cell, __build_class__ now gets a real empty cell that is
tracked as a pre-existing cell and linked to the frame's CellVariable
(SideEffects.track_cell_alias). Stores to either side are mirrored, so
methods inlined later see the current value, and side-effect replay writes
the final value into the real cell, so the class still works if it escapes
the compiled region. After a graph break the resume function gets the real
cell, so rebinding the name afterwards is visible to the methods too. A
class body that reads such a name before it is bound now raises NameError
like CPython instead of crashing. That goes through the except clause in
call___build_class__, which #195626 and #199194 also change; this only
adds NameError to it.

18 CPython tests now pass and their markers are removed: test_dict
(test_getitem, test_reentrant_insertion), test_exceptions
(test_gh_111654), test_copy (9 TestCopy tests), test_descr
(test_binary_operator_override, test_funny_new), test_augassign
(testCustomMethods1), test_contextlib (test_enter_context), test_fractions
(testIntGuaranteesIntReturn), test_long (test_mixed_compares).
test_generator's test_recursive_inorder_tree also passes now, so its
expectedFailure is dropped. The other five tests listed under root cause 2
get past this graph break and stop on separate gaps.

Part of #195901

Test Plan:

```
python test/dynamo/test_misc.py -k build_class
python test/dynamo/test_generator.py -k test_recursive_inorder_tree
PYTORCH_TEST_WITH_DYNAMO=1 python test/cpython/v3_13/test_dict.py
PYTORCH_TEST_WITH_DYNAMO=1 python test/cpython/v3_13/test_copy.py
PYTORCH_TEST_WITH_DYNAMO=1 python test/cpython/v3_13/test_exceptions.py
```

Ran all 84 test/cpython/v3_13 files under PYTORCH_TEST_WITH_DYNAMO=1 before
and after on Python 3.13; the only changes are the 18 tests above. The new
test_misc tests pass on 3.12, 3.13, 3.14 and 3.15.

Fix written with AI assistance (Claude), reviewed and tested by me.

cc @voznesenskym @penguinwu @EikanWang @jgong5 @Guobing-Chen @XiaobingSuper @zhuhaozhe @blzheng @wenzhe-nrv @jiayisunx @kadeng @chauhang @amjames @jataylo @azahed98
