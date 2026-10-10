Fixes #982
Fixes #1061

I never added proper handling for JSX attributes in the rule - this fixes that.

This also fixes a few things with testing TSX files
- the rule tester code (from the 2.0 changes) didn't allow you to change the filename
- there was no tsx test file
- there was weird behaviour from the tests if I didn't clean the caches between tests
    - it wasn't actually testing the tsx code for some reason.