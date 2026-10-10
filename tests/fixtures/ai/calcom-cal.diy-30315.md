## What does this PR do?

<!-- Please include a summary of the change and which issue is fixed. Please also include relevant motivation and context. List any dependencies that are required for this change.

Note: Cal.diy is a community-maintained open-source project. Contributions here do NOT flow to Cal.com's production service. -->

Adds a new conferencing app, `toab_jitsi`, which creates Jitsi meetings for Cal.com bookings for self hosted Jitsi servers. Meetings run on either private or popular Jitsi servers that the organizer picks from their TOAB Moderator account. Moderator API calls are authenticated with an Auth0 machine-to-machine (client credentials) token.

## Visual Demo (For contributors especially)

A visual demonstration is strongly recommended, for both the original and new change **(video / image - any one)**.

#### Video Demo (if applicable):

https://www.youtube.com/watch?v=KSkR3kZnRVM

#### Image Demo (if applicable):
<img width="1586" height="474" alt="1" src="https://github.com/user-attachments/assets/b4e25cec-8c2b-4775-9064-ac1f5d6d9d5a" />
<img width="1581" height="760" alt="2" src="https://github.com/user-attachments/assets/c1d8d80d-08dd-40d8-a9ef-a3f556586cfb" />
<img width="1581" height="760" alt="3" src="https://github.com/user-attachments/assets/9f129c25-562a-4d31-9e9b-265575774d03" />
<img width="1581" height="760" alt="4" src="https://github.com/user-attachments/assets/f69f1445-c952-4112-aae1-5ee078607a00" />
<img width="1827" height="950" alt="5" src="https://github.com/user-attachments/assets/88d404a7-fcd7-4291-8094-f39d2bf150f5" />


## Mandatory Tasks (DO NOT REMOVE)

- [ ] I have self-reviewed the code (A decent size PR without self-review might be rejected).
- [x] N/A. 
- [x] I confirm automated tests are in place that prove my fix is effective or that my feature works.

## How should this be tested?

<!-- Please describe the tests that you ran to verify your changes. Provide instructions so we can reproduce. Please also list any relevant details for your test configuration. Write details that help to start the tests -->

### Are there environment variables that should be set?

No new environment variables. You only need the normal Cal.com local setup in `.env` (`DATABASE_URL`, `NEXTAUTH_SECRET`, `CALENDSO_ENCRYPTION_KEY`, `NEXT_PUBLIC_WEBAPP_URL`).

The integration is configured through **admin app keys** in `/settings/admin` → Apps → TOAB Jitsi, not through env vars:

| Key | Required | Example |
|---|---|---|
| `moderatorHost` | yes | `https://moderator.example.com` (`https://` is added if missing) |
| `auth0Domain` | yes | `tenant.eu.auth0.com` |
| `auth0Audience` | yes | the Moderator API audience |
| `auth0TokenUrl` | no | defaults to `https://<auth0Domain>/oauth/token` |
| `auth0ClientId` | yes | Auth0 M2M client ID |
| `auth0ClientSecret` | yes | Auth0 M2M client secret |

External dependencies:
- A reachable **TOAB Moderator** instance.
- An **Auth0 M2M application** that is authorized for the Moderator API audience.

### What are the minimal test data to have?

- **Cal.com:** run `yarn db-seed`, or `yarn workspace @calcom/prisma seed-app-store` on an existing DB, so the `toab_jitsi` app row exists. Sign in with the seeded admin to set the app keys, and use a regular user (for example `pro` / `pro`) as the organizer.
- **One event type** owned by that user. Team event types also work, but the person configuring them must be a team admin.
- **Moderator:** a user whose **email exactly matches the Cal.com organizer's email**, with **at least one server** (`DEFAULT` or `CUSTOM`) assigned to them.

If you don't have a real Moderator, a stub that implements these endpoints is enough:

| Endpoint | Expected response |
|---|---|
| `POST <auth0TokenUrl>` | `{ "access_token": "…", "expires_in": 3600 }` |
| `GET /api/users/search?email=<email>` | `{ "id": 42 }` |
| `GET /api/servers?userId=42` | `[{ "id": 7, "name": "Main", "serverUrl": "https://meet.example.com", "serverType": "DEFAULT" }]` |
| `POST /api/calcom/conferences` | body `{ bookingUid, bookingId, userId, serverId }` → `{ "bookingUid": "…", "bookingId": 1, "roomId": "abc", "serverId": 7, "videoUri": "https://meet.example.com/abc" }` |
| `DELETE /api/calcom/conferences/<bookingUid>?userId=42` | any 2xx (204 is fine) |

### What is expected (happy path)?

1. **Configure keys:** as admin, fill in the app keys and save.
2. **Install:** as the organizer, install TOAB Jitsi from the App Store.
3. **Enable on an event type:** open the event type → Apps tab → turn TOAB Jitsi on. The card shows a red notice and a **disabled** server picker until the location is set.
4. **Set the location:** on the Setup tab, add the location "TOAB Jitsi Video" and save.
5. **Pick a server:** reopen the Apps tab.
   - Input: select a server in "Select Conference Server".
   - Output: the server's URL shows under the dropdown. After saving, the event type's `metadata.apps.toab_jitsi` contains `{ userId, serverId, serverUrl }`.
6. **Book:** book the event from the public booking page.
   - Input: any valid slot and attendee.
   - Output: Moderator receives `POST /api/calcom/conferences` with the booking UID, user ID and server ID. The booking's video link / location is the `videoUri` that Moderator returned.
7. **Cancel:** cancel the booking.
   - Output: Moderator receives `DELETE /api/calcom/conferences/<bookingUid>?userId=<id>`. The server logs `[toab_jitsi] sending Moderator DELETE` and the response status.

### Any other important info that could help to test that PR

**Negative cases to check:**
- **Location not saved:** the picker stays disabled with a warning. Booking fails with "Select TOAB Jitsi as this event type's location…".
- **No server selected:** booking fails with "Choose a TOAB Jitsi server in the event type settings…".
- **Organizer email not in Moderator, or Moderator down:** the settings show "Unable to load TOAB Jitsi servers from Moderator". Moderator 5xx errors are returned as 502.
- **App key missing:** the server log shows `Missing TOAB Jitsi Moderator configuration: <keys>`.
- **Another user's event type:** `GET /api/integrations/toab_jitsi/config?eventTypeId=<id>` returns 403, or a team-admin error for team event types. Without a session it returns 401.
- **Server removed in Moderator:** a previously selected server that Moderator no longer returns is cleared from app data the next time the settings open.

**Caching:**
- The Auth0 token is cached in server memory until 30s before it expires. A 401 from Moderator drops the token and retries the request once with a new one. Restart the dev server to clear the cache.
- The server list is cached in the browser for 5 minutes per event type, so a server added in Moderator may not show up until the cache expires or the page is hard-reloaded. The location check is never cached.

**Scope:**
- **Rescheduling:** `updateMeeting` does not call Moderator. A reschedule keeps the existing meeting link.
- **Tests:** the PR adds no automated tests, so verification is manual.
- **Secrets:** the Auth0 client secret never reaches the browser. You can confirm this in the network tab: neither `/config` nor `/location` returns it.

## Checklist

<!-- Remove bullet points below that don't apply to you -->

- I haven't read the [contributing guide](https://github.com/calcom/cal.diy/blob/main/CONTRIBUTING.md)
- My code doesn't follow the style guidelines of this project
- I haven't commented my code, particularly in hard-to-understand areas
- I haven't checked if my changes generate no new warnings
- My PR is too large (>500 lines or >10 files) and should be split into smaller PRs
