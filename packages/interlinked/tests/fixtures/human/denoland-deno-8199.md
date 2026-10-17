`Deno.stdout.writeSync(new TextEncoder().encode(str))` doesn't seem working for non-ascii characters on windows, but `Deno.core.print(str)` does seem working. See the comment https://github.com/denoland/deno/issues/8179#issuecomment-719431130 .

So this causes the issue #8179.

This PR replaced the use of `Deno.stdout.writeSync` in prompt with `Deno.core.print` and avoided the issue.

I checked the fix on window server 2019 machine.
<img width="542" alt="スクリーンショット 2020-10-30 23 55 05" src="https://user-images.githubusercontent.com/613956/97720266-69e2e600-1b0b-11eb-9e1c-d41117b30553.png">

fixes #8179