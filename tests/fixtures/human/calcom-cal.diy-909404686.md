I've submitted a PR that fixes this a while back but it requires some changes and is yet to be merged.

This happens because the username is taken from the NextAuth session rather than fetching the user from the /api/me endpoint.
