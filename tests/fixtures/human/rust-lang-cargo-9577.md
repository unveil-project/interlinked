The `package_default_run` test was checking the output of `cargo metadata`, which included the "targets" field. Unfortunately the order of the targets in this test depend on the filesystem order, so the test may randomly fail.

The fix here is to just check for the one field that this test was interested in.

An alternate solution would be to sort the targets.  Another alternate solution would be to use `"{...}"` for the targets to ignore them.  I kinda liked simplifying it to check just one field.

This includes a series of commits that are just general changes to the test infrastructure:

* Change cargo-test-support to use anyhow.
* Remove unused `ErrMsg`.
* Fix a bug with `verify_checks_output`.
* Remove the weird Debug impl for Execs.
* Added a helper function for getting the JSON output from cargo.  (I can imagine a lot of possible enhancements here.)


