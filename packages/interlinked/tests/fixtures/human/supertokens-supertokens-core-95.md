## Related issues:
- https://github.com/supertokens/supertokens-core/issues/78
- https://github.com/supertokens/supertokens-plugin-interface/pull/4

## Changes:
- Creates a `getSessionStorageLayer` which exposes an object that has all session-related functions.
- Changes in memory db to implement `SessionSQLStorage` instead of extending `SQLStorage`
- Changes to tests as per the above changes