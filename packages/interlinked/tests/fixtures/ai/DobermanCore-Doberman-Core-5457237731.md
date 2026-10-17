The implementation is ready for review in #498. It keeps the clipboard payload strictly allowlisted to the six redacted fields from `/api/pending`, catches both unavailable and rejecting clipboard APIs, and leaves the existing Approve/Deny flow untouched.

I added focused security regression coverage, the README update, and the required changelog fragment. All six CI checks are green across Linux 3.11–3.13, Windows 3.12, package smoke, and secret scan. Thanks again for the thoughtful pointer to this issue!
