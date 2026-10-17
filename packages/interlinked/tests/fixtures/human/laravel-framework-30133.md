<!--
Please only send a pull request to branches which are currently supported: https://laravel.com/docs/releases#support-policy 

If you are unsure which branch your pull request should be sent to, please read: https://laravel.com/docs/contributions#which-branch

Pull requests without a descriptive title, thorough description, or tests will be closed.

In addition, please describe the benefit to end users; the reasons it does not break any existing features; how it makes building web applications easier, etc.
-->

In reference to #30128, this PR allows SQLite databases to cast arrays as JSON when calling the update method directly on a model.

This allows a more consistent result when testing between mysql and sqlite, especially when using the `$casts` array on a model.
