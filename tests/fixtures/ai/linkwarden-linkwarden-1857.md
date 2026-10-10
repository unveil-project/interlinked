Fixes #1848.

## Bug
In `apps/web/pages/api/v1/users/[id]/index.ts`, the GET and PUT handlers check permission against the requested user (`queryId`) but then pass the **caller's** ID (`userId` from the token) to the controllers:

- `GET /api/v1/users/<targetId>` as an admin returns the admin's own profile (`getUserById(userId)`).
- `PUT /api/v1/users/<targetId>` as an admin silently overwrites the admin's own account (`updateUserById(userId, req.body)`), leaving the target untouched — a self-lockout risk when e.g. changing a username/email.

The DELETE handler in the same file already passes `queryId` correctly.

## Fix
Pass `queryId` to `getUserById` and `updateUserById` (2 lines). Both controllers already take the target user's ID as their first argument, and the permission checks above each call are unchanged, so self-service requests behave exactly as before.

## Verification
No test suite covers this API route, so I verified with a harness that bundles the **real** handler (imports stubbed: `verifyToken`, prisma, and the three user controllers record their calls) and drives it with fake requests:

| Scenario | Before | After |
|---|---|---|
| Admin (id 1) GET user 2 | `getUserById(1)` — admin's own profile | `getUserById(2)` |
| Admin (id 1) PUT user 2 | `updateUserById(1, …)` — self-overwrite | `updateUserById(2, …)` |
| Self GET user 1 | `getUserById(1)` | unchanged |
| Agent (id 2) GET user 1 | 401, no controller call | unchanged |
| Agent (id 2) PUT self | `updateUserById(2, …)` | unchanged |
| Admin DELETE user 2 | `deleteUserById(1, …, queryId=2)` | unchanged |

Prettier check passes on the changed file. Full workspace build was not run locally (workspace install not available in my sandbox); the change is confined to two lines in one file.

---
Fix offered freely — tips welcome: PayPal kyleblake0659@gmail.com · BTC 3GnR7TWBXAB3pPztBWpNF4LMNEX5yX8vZK · GitHub @Kshot3000 · X @kshot9000
