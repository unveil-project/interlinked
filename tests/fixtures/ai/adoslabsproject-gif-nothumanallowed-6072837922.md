You’re right that `_isSafeUrl` is undefined in the proposed patch, and I should have verified the change before submitting it.

I’ll revisit the call sites and URL construction to determine whether an attacker can actually influence the request destination. If I can establish a genuine SSRF path, I’ll provide a reproducible example in a separate issue; otherwise, I’ll withdraw the finding.

Thanks for taking the time to explain your concerns.
