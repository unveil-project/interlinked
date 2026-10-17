The current query is not portable for all possible backends. Oracle needs
`SELECT 1 FROM DUAL` whereas all other backends are using `SELECT
1`. This change indroduces a trait implemented by the connection
implementation that provides the correct query string as associated
constant.

Technically that's a breaking change, for third party backends at least. The only affected crate that I'm aware of that could be affected by this is `diesel-oci`, but I'm proposing the change from there. So I'm not sure if this needs a changelog entry?