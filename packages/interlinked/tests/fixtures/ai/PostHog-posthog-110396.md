## Problem

- Heatmaps is out of beta, but the product still shows a "Heatmaps is in beta" banner and a Beta tag in the scene title.
- Free-plan teams get no warning that heatmaps pricing changes on November 15, or what happens to pages outside their capture list.

## Changes
<img width="2880" height="1800" alt="image" src="https://github.com/user-attachments/assets/91eeb6eb-6399-4bcd-b252-eed175bfae69" />
<img width="2880" height="1800" alt="image" src="https://github.com/user-attachments/assets/fccaebb9-93fd-4590-ae99-1e7af01b358c" />
<img width="2880" height="1800" alt="image" src="https://github.com/user-attachments/assets/e7975f84-296f-4c83-940a-230e971ad98c" />

## How did you test this code?

- New stories render the notice with a populated and an empty capture list.
- Not run locally: typecheck and Jest.

**Test rationale:** the stories catch the notice disappearing or showing the wrong sentence. A unit test of the show condition, a guard on three values, would add little.

## Release status

- [x] No feature flag controls this change <!-- release-status: no-feature-flag -->
- [ ] This change is behind a feature flag and is not available to users <!-- release-status: behind-feature-flag -->
- [ ] This change makes a previously flagged feature available to everyone <!-- release-status: fully-available -->

## Automatic notifications

- [ ] Publish to changelog?

## Docs update

None.

## 🤖 Agent context

**Autonomy:** Human-driven (agent-assisted)

**Agent:** Claude Code, Opus 5.5

Built with Claude Code, directed by the assignee. Skills invoked: /simplify, /reviewing-with-coderabbit, /writing-pr-descriptions. CodeRabbit CLI (without `--deep`) reported no findings.

