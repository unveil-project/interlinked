# Description of Changes

Shared signing sends no email today. Participants only find a request by opening Shared Signing, guests added by email address have no way to learn their link exists, and the requester has to keep checking for progress.

With `mail.enabled` on, signing now sends an email at each step of a request.

## User stories

| | As a... | I want... | So that... |
|---|---|---|---|
| U1 | participant | an email when I am asked to sign, with the requester's message, the due date and a button to the request | I know there is something to sign without checking the app |
| U2 | guest participant (added by email, no account) | my personal signing link in that email, with a warning not to forward it | I can sign without an account, knowing the link signs as me |
| U3 | requester | an email whenever someone signs, showing how many have signed and who is still outstanding | I can follow progress without polling |
| U4 | requester | the same email when someone declines, including their reason | I can fix the document or chase the right person |
| U5 | requester | to be told when everyone has responded and the document is ready to finalize | I finalize at the right time |
| U6 | participant | an email when the requester finalizes, saying whether my signature is included and linking to the signed PDF | I get the final document |
| U7 | administrator | the emails to need only the existing mail settings, to link through `system.frontendUrl` (falling back to `backendUrl`), and a mail outage never to fail a signature | it is safe to turn on |

Nobody is emailed about their own action: requesters are not invited to their own request, or told about their own signature or finalization.

## Screenshots

Delivered emails from one request: Bob and Carol have accounts, Lee is a guest. Bob signs, Lee declines with a reason, Carol signs, then Jane finalizes.

<table>
<tr><td width="50%" valign="top"><b>Invitation, account holder</b><br><img alt="Invitation, account holder" src="https://github.com/user-attachments/assets/2d14d0b8-2c95-4641-add2-ce89be65b074" /></td><td width="50%" valign="top"><b>Invitation, guest (token link)</b><br><img alt="Invitation, guest (token link)" src="https://github.com/user-attachments/assets/6ee483b7-bf91-4ddf-b11e-b1dc9714cc97" /></td></tr>
<tr><td width="50%" valign="top"><b>Requester: someone signed</b><br><img alt="Requester: someone signed" src="https://github.com/user-attachments/assets/b9d951e9-ef2e-4136-bafe-36a5efd387d8" /></td><td width="50%" valign="top"><b>Requester: someone declined, with reason</b><br><img alt="Requester: someone declined, with reason" src="https://github.com/user-attachments/assets/8cee3649-4cee-4d58-8680-dcd122d2ccf3" /></td></tr>
<tr><td width="50%" valign="top"><b>Requester: ready to finalize</b><br><img alt="Requester: ready to finalize" src="https://github.com/user-attachments/assets/d7d666cf-11c7-4823-90c7-80f4b6a2b639" /></td><td width="50%" valign="top"><b>Finalized: signer</b><br><img alt="Finalized: signer" src="https://github.com/user-attachments/assets/9326c206-98e4-40ea-af22-b8176336f635" /></td></tr>
<tr><td width="50%" valign="top"><b>Finalized: guest who declined</b><br><img alt="Finalized: guest who declined" src="https://github.com/user-attachments/assets/633ef000-d2fc-4e06-bb9a-79eb59b7b3c2" /></td><td></td></tr>
</table>

## What changed

- **Events and listener** (`workflow/notification/`): `WorkflowSessionService` and `WorkflowParticipantController` publish `SigningInvitationEvent`, `SigningResponseEvent` and `SigningCompletionEvent`, carrying IDs only. `SigningNotificationListener` handles them after commit, so a rolled-back action sends nothing, and reloads the session in its own read-only transaction because open-in-view is off. Every failure is logged and swallowed: the token endpoints have no transaction, so there the listener runs inside `publishEvent`.
- **Links**: account holders get `{frontendUrl}/shared-sign`, which signs them in and lists the request, so no bearer token is mailed to an account. Guests get `{frontendUrl}/workflow/sign/{token}`. The request's Host header is never used. With no URL configured, account holders get the email without a button and guests are skipped with a warning.
- **Branding** (`EmailService.sendBrandedEmail`): the `ui/Logo.tsx` lockup, rasterised to `email/stirling-lockup.png`, is attached inline (`cid:stirling-logo`), so it shows without any remote fetch. Buttons and links use `--c-brand` (#af3434, the sign-in CTA colour), with the theme's ink and paper colours, in a table layout that Outlook renders.
- **Guest download**: `/api/v1/workflow/participant/document` resolves the token in `WorkflowSessionService.getParticipantDocument` and serves the signed PDF once the session is finalized. It served the original, which main deletes at finalization.
- **Fix**: Jackson 3 bound `ParticipantRequest` through Lombok's unused all-args constructor, so an omitted `sendNotification` arrived as `false` and the participant was never invited (the UI always sends `true`).
- A response that lands after finalization (main has no active-session check on authenticated sign and decline) sends nothing, rather than a "ready to finalize" email.

No endpoints, request fields or schema change.

## How to test

1. Set `mail.enabled`, `storage.enabled` and `storage.signing.enabled` to true, point `mail.host` at any SMTP sink, and set `system.frontendUrl`.
2. Request signatures from two users and one email address: each gets an invitation.
3. Sign as one user, decline as the guest (`POST /api/v1/workflow/participant/decline?token=...&reason=...`), then sign as the other user: the requester gets three emails, the last titled "ready to finalize".
4. Finalize: every participant gets the completion email, and the guest's link downloads the signed PDF.

## Testing done

- Unit, template and real-transaction (H2) tests for the listener, plus updated workflow tests. The proprietary suite runs 4,004 tests with one failure, `FolderIdentitiesTest`'s symlink case, which needs a Windows privilege and is unrelated.
- End to end against a running backend and an SMTP sink, mapped to the shared-signing stories in the #8189 review (S01 to S12): 40 of 41 checks pass. This covers unicode names, escaped HTML in messages and reasons, forged Host headers, adding, removing and re-adding participants, early and normal finalization, signed-PDF downloads, mail disabled, mail server down, and both URL fallbacks. The account-holder link was also followed in the browser: logged out, it goes to sign-in and then to Shared Signing with the request listed.
- The one failing check is pre-existing on main: the guest token endpoints throw `LazyInitializationException` (#7867). The guest's decline and its email still land, but the guest gets a 500. With #7867 merged locally, guest page load, token sign, token decline with reason, and the signed download all pass.

## Interactions with open PRs

- #7867 fixes the guest token endpoints that guest participants depend on. Both PRs change `WorkflowParticipantController.getDocument`; keep this PR's service call.
- #8189 rewrites the same hook points, so expect conflicts in `WorkflowSessionService` and `WorkflowParticipantController`. Each hook is one line.
- #7863 edits other `EmailService` methods; no overlap.

Out of scope: reminders, per-user notification preferences, translated emails (the existing emails are English-only), and moving participants to `NOTIFIED` (sends are async, so the server cannot tell a queued email from a delivered one).

---

## Checklist

### General

- [x] I have read the [Contribution Guidelines](https://github.com/Stirling-Tools/Stirling-PDF/blob/main/CONTRIBUTING.md)
- [x] I have read the [Stirling-PDF Developer Guide](https://github.com/Stirling-Tools/Stirling-PDF/blob/main/DeveloperGuide.md) (if applicable)
- [ ] I have read the [How to add new languages to Stirling-PDF](https://github.com/Stirling-Tools/Stirling-PDF/blob/main/devGuide/HowToAddNewLanguage.md) (if applicable)
- [x] I have performed a self-review of my own code
- [x] Every comment I added says something the code does not ([guide](https://github.com/Stirling-Tools/Stirling-PDF/blob/main/devGuide/CODE_COMMENTS.md))
- [ ] My changes generate no new warnings

### Documentation

- [ ] I have updated relevant docs on [Stirling-PDF's doc repo](https://github.com/Stirling-Tools/Stirling-Tools.github.io/blob/main/docs/) (if functionality has heavily changed)
- [ ] I have read the section [Add New Translation Tags](https://github.com/Stirling-Tools/Stirling-PDF/blob/main/devGuide/HowToAddNewLanguage.md#add-new-translation-tags) (for new translation tags only)

### Translations (if applicable)

- [ ] I ran [`scripts/counter_translation.py`](https://github.com/Stirling-Tools/Stirling-PDF/blob/main/docs/counter_translation.md)

### UI Changes (if applicable)

- [x] Screenshots or videos demonstrating the UI changes are attached (e.g., as comments or direct attachments in the PR)

### Testing (if applicable)

- [ ] I have run `task check` to verify linters, typechecks, and tests pass (ran `task pre-commit`, `spotlessCheck` and the backend tests; frontend and engine are untouched)
- [x] I have tested my changes locally. Refer to the [Testing Guide](https://github.com/Stirling-Tools/Stirling-PDF/blob/main/DeveloperGuide.md#7-testing) for more details.


<!-- This is an auto-generated comment: release notes by coderabbit.ai -->
## Summary by CodeRabbit

## Summary

* **New Features**
  * Signing workflows can send branded email invitations, response updates, and completion notices with signing links and progress details.
  * Participants receive the original document before a session is finalized and the signed document afterward.
  * Signing and declining actions can trigger notifications to the session owner.
  * Email invitations are enabled by default unless turned off.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->
