Two things since the last comment.

The README still said the Linux host case was untested, which stopped being true when the two-account run was done that way. Corrected, along with a note that a browser that was killed rather than closed leaves a `SingletonLock` naming the machine that wrote it — the container reads that as the profile being open elsewhere and fails startup with the same error a genuinely open window gives, which is not obvious from the message.

And the browser-gated case now runs green rather than being asserted to: `REWARDS_BROWSER_TESTS=1 python -m unittest discover -s tests` inside the container is 31 tests, 0 skipped, in 25.8s, against Edge 151.0.4129.107 with a driver of the same build.
