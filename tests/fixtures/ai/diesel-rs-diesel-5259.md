Diesel's typed `PRAGMA` query struct is private, so downstream crates must construct SQL for settings without a built-in helper. `Pragma` declares a name and `PerSchema` or `PerConnection` scope, `ReadPragma` declares the returned row, and `WritePragma` supplies a value through `ToPragmaLiteral`.

The existing helpers for standard SQLite pragmas now have been refactored to use this shared path. The scope distinction prevents schema qualifiers on connection-wide settings, where SQLite would silently ignore them.

My use case for this is a downstream diesel extension for [SQLCipher](https://github.com/sqlcipher/sqlcipher) & [SQLite3mc](https://github.com/utelle/SQLite3MultipleCiphers).
