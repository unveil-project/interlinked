## Summary

This reviews the `cy.session()` API page against the Cypress v16.2.1 source and fixes what didn't match. It also adds six examples for common workflows, a lifecycle diagram, and fresh screenshots from real runs, and brings the page in line with our writing guidelines. One link in the `cy.getCookie()` page changes to follow a renamed heading.

## Why

The page had drifted from how `cy.session()` behaves, and a few examples didn't run as written. I checked every behavior claim against `packages/driver/src/cy/commands/sessions/` and confirmed each one at runtime.

**Accuracy fixes**

- **What invalidates a session.** A bare `return false` from `validate` doesn't invalidate it. A `false` yield counts only when `validate` returns nothing or returns a Cypress chain.
- **Reusing an id.** The cross-spec section framed the duplicate-id error as a cross-spec issue. It now shows the error a reused `id` with a different `setup` actually produces, next to the example that defines the session once in a shared file.
- **When data is cleared.** Session data is cleared before a restore too. With test isolation off, the page after `cy.session()` depends on whether the session was created or restored.
- **Cross-domain section.** It told readers to visit the domain before calling `cy.session()`. That visit does nothing: `cy.session()` clears the page, and a relative `cy.visit()` resolves against `baseUrl`. Its example also had a syntax error and an invented domain.
- **Choosing an id.** It suggested `uuid`, but a random `id` never matches a saved session. The custom command examples put the password in the `id`, which the page warns against because the `id` shows in the Command Log.
- **Undocumented behavior, now documented:**
  - A Promise from `setup` or `validate` has a 20-second limit.
  - `cy.session()` isn't supported inside `cy.origin()`.
  - It throws in component tests.
- **Broken examples.**
  - An invalid regex.
  - `should('eq')` called on an element.
  - Selectors that matched nothing.
  - A block that redeclared `const login` four times.

**New content**

- **Six examples:**
  - Using the status `cy.session()` yields.
  - A `validate` that skips the network.
  - Caching with test isolation disabled.
  - Signing in through an identity provider with `cy.origin()`.
  - Testing logout without ending the shared session.
  - Reusing an `id` with a different `setup`.
- **A lifecycle diagram** of the create, restore, and recreate paths.
- **Recaptured screenshots.** The old ones came from the Real World App. The expanded Command Log image didn't match its caption, and the console image showed a password inside the session `id`. Every image now comes from a Cypress 16.2.1 run of a snippet on this page. The Sessions panel screenshot also appears where the page explains the globe icon and the **Clear All Sessions** button.

**Writing guidelines**

- **Examples show the recommended way.** The custom command, helper function, and returns-a-value sections showed Before and After versions, the `cy.visit()` section opened with the pattern to avoid, and the id section had an Incorrect Usage example. Each now shows only the recommended version.
- **JavaScript and TypeScript.** The two custom command examples are `copyTsToJs` blocks, which render as JavaScript and TypeScript tabs now that #7071 is merged.
- **Formatting and wording.**
  - The options table is alphabetized.
  - The text uses present tense and active voice.
  - Bold appears only on real UI controls.
- **Headings.** They now carry their own context and use sentence case.
- **Links.** Test isolation links go to the dedicated page, and See also was refreshed.
- **Less repetition.** The `setup` argument links to the Notes section on clearing instead of repeating it.

## Notes for reviewers

- **How the examples were verified.** Every added or rewritten example ran verbatim in the `.example-check/` harness, with an assertion for each claim in the prose. Examples on stand-in hosts ran against local servers mapped to `app.cypress.io` and `auth.cypress.io`. The TypeScript blocks typecheck. Blocks whose only change was to code comments, and the id examples that call an undefined `loginWith()` for illustration, were parse-checked instead of run.
- **Screenshot capture.** The screenshots follow `scripts/screenshots/README.md` on Cypress 16.2.1. The `validate` in the Command Log snippet uses `failOnStatusCode: false`, so a failure reads as one assertion rather than a full request dump. The page explains this.
- **The diagram** passes WCAG 2.2 AA:

  | Element | Ratio |
  | --- | --- |
  | Text | 5.71:1 to 16.51:1 |
  | Lines and shapes | 3.90:1 or better |

  It simplifies one edge case: a saved session whose `setup` source changed takes the create path. That mostly matters on reruns in `cypress open`.
- **Example order.** The examples stay at H3, so they appear in the table of contents. They're ordered so related ones sit together. I tried grouping them under H3 headings, but that dropped them out of the table of contents, so I reverted it.
- **Left as is:**
  - The "E2E only" badge, which is correct. The `cypress/react` mount adapter makes `cy.session()` throw in component tests.
  - The `Chainable<void>` typing on the example custom commands.
- **CI.** The first E2E run failed one Support Assistant test that this PR doesn't touch. It passes on `main` and passed on re-run. Details are in the comment below. Later E2E "failures" on intermediate commits were runs cancelled by the next push.
- **Follow-up in `cypress-io/cypress`.** The invalid-option error says "Available options are: `validate`" but leaves out `cacheAcrossSpecs` (`packages/driver/src/cypress/error_messages.ts`). That fix belongs in the Cypress repo.

No issue is linked: this came from a direct request to review the page.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WUv8r2DMN6bq2T9oJujuqi

<!-- CURSOR_SUMMARY -->
---

> [!NOTE]
> **Low Risk**
> Documentation and static assets only; no runtime or test code changes.
> 
> **Overview**
> This PR **realigns the `cy.session()` API docs with Cypress v16.2.1 behavior** and expands guidance for common auth patterns.
> 
> **Accuracy and behavior clarifications** include when `validate` invalidates a session (e.g. bare `return false` does not), duplicate `id` rules within a spec (function source comparison), when page and session data are cleared on create vs restore, and constraints such as E2E-only usage, no `cy.session()` inside `cy.origin()`, and a 20s Promise limit for `setup`/`validate`. Examples are rewritten or fixed (ids without passwords, regex, selectors) and **six new workflow examples** cover status yields, offline validation, test isolation off, `cacheAcrossSpecs`, logout without polluting shared sessions, SSO via `cy.origin()`, and cross-domain restore.
> 
> A new **`session-lifecycle-diagram.svg`** illustrates create/restore/recreate paths; Command Log screenshots and captions are refreshed. **`cy.getCookie()`** now links to the renamed validate section anchor.
> 
> <sup>Reviewed by [Cursor Bugbot](https://cursor.com/bugbot) for commit b26c5e3e3c181c2de3461a23b4525a18e477debe. Bugbot is set up for automated code reviews on this repo. Configure [here](https://www.cursor.com/dashboard/bugbot).</sup>
<!-- /CURSOR_SUMMARY -->