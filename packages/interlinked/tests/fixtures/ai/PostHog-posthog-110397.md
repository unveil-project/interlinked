## Problem

Delivery is meant to hold an address and read the facts, so a retry announces what was recorded rather than what one attempt happened to carry. Nothing reads them. `platform_alert_events` has had a writer since [#104857](https://github.com/PostHog/posthog/pull/104857) and no reader at all, and the delivery package below this builds messages from a type nothing produces.

## Changes

- Nothing reaches a user. The package still has no caller; this adds the function the caller will stand on.
- `announcement(team_id, configuration_id, evaluation_key)` returns what one evaluation left for a destination to say, as the `EvaluationAnnouncement` the message builder already takes.
- A check that announced nothing reaches no destination. `CHECK` rows are excluded in the query, not by the caller: they exist so a comparison can read every check, and a message built from one would have no headline.
- An evaluation that announced nothing at all returns None rather than an empty announcement, so a caller has one thing to check rather than two.
- A group written twice announces once. `LIMIT 1 BY grouping_key` takes the newest row per group, because the insert's deduplication token only covers a retry the engine still remembers.
- A snapshot column the writer left empty, or one that predates a field it now holds, reads as an empty dict rather than raising. History is read long after it is written, and a message that states less beats one that cannot be built.

## How did you test this code?

Each bullet names the regression the test catches.

- **A recorded firing comes back as the message it should send**, including both snapshots. Without them a message would re-read the configuration and could state a threshold that changed since the check.
- **A check that announced nothing reaches no destination.** Drop the kind filter and every confirming check sends a message with no headline.
- **Every group that announced gets its own transition.** The projection is per group, which is what fan-out needs.
- **A group written twice announces once, from the newer row.** Drop `LIMIT 1 BY` and a late retry's second row sends the alert a second time. The test reaches that state with its own deduplication token, because under the real one the engine correctly drops the repeat.
- **Another evaluation of the same alert is not mixed in.** The evaluation key is what separates one announcement from the next.

Not run: any send to a real Slack workspace. There is still no caller.

## And then the wiring

The second commit closes the gap between a recorded evaluation and a message.

- `AlertDeliveryRequest` replaces `AlertDeliveryPreview`. The payload is an address, so a retry announces what was recorded rather than what one attempt carried, and a batch's payload no longer grows with what its alerts say.
- The source supplies the two destination fields, because only it knows them: the id its destinations are matched on, and the event id each kind it can announce filters on. The platform imports no source.
- Destinations resolve at send time. One removed between the check and the send is then not sent to, which a pinned id set would get wrong.
- Only the kinds an evaluation announced decide who hears about it, so a destination configured for firings does not receive a resolve.
- A destination type with no native transport is skipped rather than failing the send.
- The activity crosses into the package through `database_sync_to_async_pool`, the way `alerts_platform_discover_demand_activity` already does. The package reads ClickHouse, resolves destinations through the ORM and posts over a blocking client, and Django refuses an ORM call from a thread with a running event loop.
- A destination lookup can no longer be recorded as a check failure, because the check path no longer does one. The test that guarded that is removed with it.

> [!WARNING]
> `alert-platform-live-delivery` gates every send, read with a `project` group because that is what the flag's condition matches on. A check without it never matches, and the platform would stay silent with nothing to say why. The check fails closed, so a flag-eval blip leaves the production logs path as the only deliverer.
> It becomes a flag read **only by the platform**, scoped to the dogfooding project. The production logs path stays untouched on purpose: embedding a flag there to stop it delivering risks shutting off production alerting, and proving native delivery does not need that risk taken.
> So liveness is additive. A team with it on receives the legacy message and the native one for the same alert, and double-notifying the dogfooding project is accepted rather than worked around. Flipping a team from one deliverer to the other is the cutover, and belongs to D3.

Tests for that half: a destination with no transport is skipped rather than failing the send; one that is not fully enabled receives nothing; the lookup asks only for the event ids of the kinds announced; an evaluation that announced nothing resolves no destinations; and `DESTINATIONS_ARE_LIVE` is false.

## On destinations, and why no ids

The payload was going to carry destination ids. Reading the code, there is no destination id to carry: `ActiveAlertDestination.id` is one HogFunction row id, and a destination a person configured is a *group* of those rows.

Landing `AlertDestination` to get one would mean keeping a copy in lockstep with every create and delete on the destination API, forever, where a miss is silent and user-visible. So it lands at the control-plane move instead, where ownership inverts and there is nothing to sync. The trigger, the transition steps and the guard are recorded in the plan docs.

That makes re-resolution the better behaviour rather than the compromise: a destination deleted between the check and the send is not sent to.

## Release status

- [x] No feature flag controls this change <!-- release-status: no-feature-flag -->

Strictly unreferenced rather than flagged. No caller imports `announcement`.

## Automatic notifications

- [ ] Publish to changelog?

## Docs update

None. No user-facing behavior, API or documented workflow changes yet.

## 🤖 Agent context

**Autonomy:** Human-driven (agent-assisted)

**Agent:** Claude Code, Opus 5

Skills invoked: `/writing-tests`, `/writing-code-comments`, `/writing-dataclasses`, `/stacking-prs`, `/writing-pr-descriptions`.

`announcement` lives next to `insert_events` rather than in `logic/platform_lifecycle.py`, where an earlier plan put it. The read and the write share the table, the column list and the deduplication reasoning, and `platform_lifecycle.py` is already the largest module in the product.

**A decision surfaced by writing this, since settled.** The payload was to carry destination ids so the reader would not re-run a lookup. Reading the code, there is no destination id to carry: `ActiveAlertDestination.id` is one HogFunction row id, and a destination a person configured is a *group* of those rows, assembled by `list_alert_destination_groups` from their template and config. So the candidates are a tuple of row ids per destination, which still needs those rows read to rebuild `AlertDestinationData`, or the lookup key the check already used, `alert_id` plus the event id. Both read the rows; only the first pins which rows. That is a narrower difference than "carry ids or re-query". Resolved in favour of re-resolving: see "On destinations, and why no ids" above.

Public artifact: the diff and this description draw only on code in this repository.



