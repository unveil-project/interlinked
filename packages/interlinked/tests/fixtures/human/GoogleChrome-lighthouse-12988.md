https://github.com/GoogleChrome/lighthouse/pull/12973#discussion_r696889448

Full page screenshot looks ok, but the timeline view has incorrect dimensions:
![Screen Shot 2021-08-26 at 4 00 51 PM](https://user-images.githubusercontent.com/6752989/131028157-3863bf1c-534f-4146-819b-046dcfdd31fa.png)

Edit: current workaround for Puppeteer is to use `ignoreDefaultArgs: ['--enable-automation']`

```js
await puppeteer.launch({
  ignoreDefaultArgs: ['--enable-automation'],
});
```

Edit2: The above workaround isn't enough if you are using [Chrome for testing](https://developer.chrome.com/blog/chrome-for-testing/) which Puppeteer uses by default now. You can specify a path to a normal Chrome executable as a workaround:

```js
await puppeteer.launch({
  ignoreDefaultArgs: ['--enable-automation'],
  executablePath: '/path/to/chrome'
});
```
