## Problem

Fixes #51386.

Password managers can autofill the Supabase account login password into the database password fields in Studio (Project Settings → Database → Reset database password, and the new-project database password). Both inputs only set `autoComplete="off"`, which LastPass is known to ignore on `type="password"` fields. Whatever gets autofilled there becomes the Postgres password.

## Solution

Both inputs now carry the password-manager opt-out attributes already used across Studio (see #42667 and #50794):

```tsx
autoComplete="new-password"
data-1p-ignore
data-lpignore="true"
data-form-type="other"
data-bwignore
```

Adds a component test for `DatabasePasswordInput` asserting these attributes on the rendered input. The test fails on the unpatched code (`autocomplete` stays `"off"`, no opt-out attributes) and passes with the fix. All 58 tests in `components/interfaces/ProjectCreation` pass, and the changed files pass Prettier.
