Hi! Checking in on this one — it's been open for a month without a review, and #2356 is still open with no other PR touching it.

The change is small: the `files` setter now returns early when the value is `null`/`undefined`, or when the input isn't `type="file"`, so those writes are no-ops the way they are in browsers and jsdom — otherwise the value gets stored as-is and the `.value` getter throws. Tests cover the null, undefined and non-file cases, and all three Node legs (20/22/24) are green on the current head.

If you'd rather see a warning, a throw or a different surface for clearing the selection, I'm happy to reshape it — just say which way you want it.
