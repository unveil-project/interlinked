It's patch for [this feature](https://github.com/nuxt/nuxt.js/issues/8262)
May be it the fix not a feature

1) The `renderAndGetWindow` method can pass `virtualConsole` option as `false`
2) If we pass to `renderAndGetWindow` method our `virtualConsole` instance it will not be touched by nuxt

All unit tests are passed by `yarn test:unit`
