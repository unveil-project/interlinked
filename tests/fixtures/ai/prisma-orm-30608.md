Preserve PostgreSQL driver defaults when a connection URL omits its host. Hostless credentialed URLs and Unix-socket host query parameters retain their original value; normalization removes empty userinfo while retaining a supplied password even when the username is empty. An explicit port without a host is rejected with RUNTIME.BINDING_INVALID before driver construction.

Fixes #8230.

/claim #8230

Prior-head validation on 47d14935147b97ed26202c943e579627845c9bb3: 11 focused cases using Node 24.19.0, pg 8.23.1 and pg-connection-string 2.14.1. Seven valid cases passed actual parser and Client construction, two port-without-host cases reproduced the previous driver failure and now return the structured validation error, and wrong-scheme/empty-input cases remain rejected. No database connection or full project test suite was run.

Current head `f3be26110e27b498d596708a01f3112e329b437e` includes the subsequent binding regression coverage and normalizes complete empty `:@` userinfo as well as `@` on hostless URLs, while preserving a supplied password and Unix-socket query parameters. The existing empty-userinfo regression now includes the `:@` cases. No tests or builds were run for this current head; the earlier validation above applies only to its named prior head.


## Contributor compensation and payment claim

My original claim for #8230 remains **ACTIVE**. I demand payment of the applicable bounty for this contribution to the original claimant and recipient, **Bryce / @tokenjunkielabs (GitHub ID 311286379)**. Please confirm the reward allocation, creator approval step, established payout process and payment timing. I will provide my verified payment recipient details through your established payout process. Pending DCO, maintainer review and reward eligibility decisions do not withdraw, waive, transfer or forfeit my claim.

<!-- This is an auto-generated comment: release notes by coderabbit.ai -->
## Summary by CodeRabbit

* **Bug Fixes**
  * PostgreSQL connection URLs with a hostname are now returned in normalized form while retaining credentials, port, path, query parameters, and fragment.
  * Hostless PostgreSQL URLs preserve their original value and credentials, and empty user information is cleaned up.
  * URLs that specify a port without a host are rejected. Invalid schemes and blank input are also rejected.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->