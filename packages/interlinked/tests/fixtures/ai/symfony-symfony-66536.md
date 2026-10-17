| Q             | A
| ------------- | ---
| Branch?       | 7.4
| Bug fix?      | yes
| New feature?  | no
| Deprecations? | no
| Issues        | Fix #66520
| License       | MIT

Setting a `Content-Language` header on an `Email` makes the Graph transport fail the whole send:

```
InvalidInternetMessageHeader: The internet message header name 'Content-Language' should start with 'x-' or 'X-'. (code 400)
```

Graph accepts an `internetMessageHeaders` entry only when its name starts with `x-`, and rejects the request otherwise. `getMessageCustomHeaders()` forwarded everything except a denylist, so any standard header on the message reached the API and failed it.

The denylist has been extended one header at a time already, `Return-Path` in #62984 and `Sender` in #63264, and it still misses `Content-Language`, `In-Reply-To`, `References`, `Auto-Submitted` and anything else standard that a user sets. Selecting on the prefix Graph documents covers the whole class instead of the next reported header.

Before and after, for `$email->getHeaders()->addHeader('Content-Language', 'en-US')`:

```php
// before: the header is forwarded, Graph returns 400 and nothing is sent
// after:  the header is dropped, the mail is sent
```

Nothing changes for `x-` prefixed headers. They were forwarded before and still are, and the two that belong to the API request rather than to the message (`x-ms-client-request-id`, `x-ms-content-sha256`) are still excluded. The other entries in the old denylist were all non-`x-`, so the prefix check already covers them.

The narrower alternative is to add `content-language` to the denylist and wait for the next header. Happy to switch to that if you prefer it.

## Test Plan

Extended the existing `headersToByPassProvider` with `Content-Language`, `In-Reply-To`, `References` and `Auto-Submitted`, and added a test that a message carrying both a standard and an `x-` header forwards only the `x-` one. The bridge goes from 45 to 50 tests. Reverting the transport while keeping the tests fails exactly those 5 new cases, and the full `Mailer` component is green at 959 tests.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_011M5uTyCU4WcNTsPvGrErDo
