The LSP spec is unclear about what exactly specifying support for `CodeActionKind`s means. We support applying all kinds in the spec equivalently and some servers (including dartls) won't send code actions if support for the relevant kinds is not explicitly stated in the client capabilities. Therefore, this PR makes that support explicit.

Also, as we support all `CodeActionKind`s, we should also mark the server as supporting code actions when it specifies code action kinds. This is also done in this PR.

Fixes #13057 