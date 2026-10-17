My last pull request (https://github.com/matomo-org/matomo/pull/14901) tried to fix the problem of values with spaces at the end in the Sparkline class (making the values "non-numeric").

While doing some more debugging I also encountered "non-breaking" spaces in some values, which the trim() function (my previous fix) does not remove.

These special spaces are hard to remove, because they sometimes are encoded in ISO/ASCII (hex 0xA0) as well as UTF-8 (hex 0xC2 0xA0). Without making use of the mb_* functions it will be hard to remove all of them while not damaging utf-8 strings.

This PR tries to solve the problem by making use of filter_var() to sanitize the value and remove all non-numeric characters.

See also https://github.com/matomo-org/matomo/issues/14662#issuecomment-534505048