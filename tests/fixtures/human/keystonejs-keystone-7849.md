## Reproduction scenario
1.  Create a monorepo with keystone as one of the projects
2. Try to build and run a different project in the monorepo

## Problem context
The issue is that the `postinstall` script will always run during the monorepo installation, which means that the `keystone` project will try to generate files which may not be related at all to the `keystone` project.

This will break a build for `project-x` in the monorepo when the keystone `postinstall` fails -- The `postinstall` will fail if, for example, a session secret needed for keystone session doesn't exist in the environment. 

This is problematic, because its now require to ensure that the environment that deploys `project-x` has environment variables that keystone requires.

## Resolution
The `postinstall` script should not be coupled like this, it should be an opt-in script (docs recommend keeping it as is)  and perhaps run silently as part of `keystone dev`
