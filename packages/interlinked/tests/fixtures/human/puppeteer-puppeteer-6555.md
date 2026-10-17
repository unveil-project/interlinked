With `nodejs@15.0.1`, install puppeteer with `https_proxy=http://*/` set will cause error like:
```
> puppeteer@5.4.1 install /home/dr/Git/dr-js/node_modules/puppeteer
> node install.js

ERROR: Failed to set up Chromium r809590! Set "PUPPETEER_SKIP_DOWNLOAD" env variable to skip download.
TypeError [ERR_INVALID_PROTOCOL]: Protocol "https:" not supported. Expected "http:"
    at new NodeError (node:internal/errors:258:15)
    at new ClientRequest (node:_http_client:155:11)
    at Object.request (node:https:313:10)
    at httpRequest (/home/dr/Git/dr-js/node_modules/puppeteer/lib/cjs/puppeteer/node/BrowserFetcher.js:488:17)
    at downloadFile (/home/dr/Git/dr-js/node_modules/puppeteer/lib/cjs/puppeteer/node/BrowserFetcher.js:357:21)
    at BrowserFetcher.download (/home/dr/Git/dr-js/node_modules/puppeteer/lib/cjs/puppeteer/node/BrowserFetcher.js:239:19)
    at async downloadBrowser (/home/dr/Git/dr-js/node_modules/puppeteer/lib/cjs/puppeteer/node/install.js:48:5) {
  code: 'ERR_INVALID_PROTOCOL'
}
```

The related issue is at https://github.com/TooTallNate/node-agent-base/pull/47,
  from package `agent-base` under `https-proxy-agent`

And the `https-proxy-agent` major version bump is for `Refactor to TypeScript`: https://github.com/TooTallNate/node-https-proxy-agent/compare/4.0.0...5.0.0

--- --- ---

Also there's an older `"https-proxy-agent": "^2.2.1",` under `experimental/puppeteer-firefox/package.json`, I did not change that since it's marked experimental.

And `npm@6` also uses `https-proxy-agent` but didn't hit the protocol auto detect bug, because it uses `http-proxy-agent` separately for `http_proxy` in [`make-fetch-happen/agent.js#L185-L199`](https://github.com/npm/make-fetch-happen/blob/v8.0.10/agent.js#L185-L199) (but `npm@7` did hit the bug https://github.com/npm/cli/issues/2003)

--- --- ---

And a simple package test: (with `nodejs@15.0.1` & `npm@7.0.5`)
```shell script
nano package.json # paste original file
npm i --production --package-lock-only --ignore-scripts # just get the `package-lock.json`
mv package-lock.json package-lock.json-org # rename for next run

nano package.json # change to `"https-proxy-agent": "^5.0.0",`
npm i --production --package-lock-only --ignore-scripts

diff package-lock.json-org package-lock.json
```

and the diff result:
```diff
16c16
<         "https-proxy-agent": "^4.0.0",
---
>         "https-proxy-agent": "^5.0.0",
1599,1601c1599,1604
<       "version": "5.1.1",
<       "resolved": "https://registry.npmjs.org/agent-base/-/agent-base-5.1.1.tgz",
<       "integrity": "sha512-TMeqbNl2fMW0nMjTEPOwe3J/PRFP4vqeoNuQMG0HlMrtm5QxKqdvAkZ1pRBQ/ulIyDD5Yq0nJ7YbdD8ey0TO3g==",
---
>       "version": "6.0.2",
>       "resolved": "https://registry.npmjs.org/agent-base/-/agent-base-6.0.2.tgz",
>       "integrity": "sha512-RZNwNclF7+MS/8bDg70amg32dyeZGZxiDuQmZxKLAlQjr3jGyLx+4Kkk58UO7D2QdgFIQCovuSuZESne6RG6XQ==",
>       "dependencies": {
>         "debug": "4"
>       },
5296,5298c5299,5301
<       "version": "4.0.0",
<       "resolved": "https://registry.npmjs.org/https-proxy-agent/-/https-proxy-agent-4.0.0.tgz",
<       "integrity": "sha512-zoDhWrkR3of1l9QAL8/scJZyLu8j/gBkcwcaQOZh7Gyh/+uJQzGVETdgT30akuwkpL8HTRfssqI3BZuV18teDg==",
---
>       "version": "5.0.0",
>       "resolved": "https://registry.npmjs.org/https-proxy-agent/-/https-proxy-agent-5.0.0.tgz",
>       "integrity": "sha512-EkYm5BcKUGiduxzSt3Eppko+PiNWNEpa4ySk9vTC6wDsQJW9rHSa+UhGNJoRYp7bz6Ht1eaRIa6QaJqO5rCFbA==",
5300c5303
<         "agent-base": "5",
---
>         "agent-base": "6",
5304c5307
<         "node": ">= 6.0.0"
---
>         "node": ">= 6"
7994a7998,8006
>     "node_modules/puppeteer-core/node_modules/agent-base": {
>       "version": "5.1.1",
>       "resolved": "https://registry.npmjs.org/agent-base/-/agent-base-5.1.1.tgz",
>       "integrity": "sha512-TMeqbNl2fMW0nMjTEPOwe3J/PRFP4vqeoNuQMG0HlMrtm5QxKqdvAkZ1pRBQ/ulIyDD5Yq0nJ7YbdD8ey0TO3g==",
>       "dev": true,
>       "engines": {
>         "node": ">= 6.0.0"
>       }
>     },
8000a8013,8025
>     "node_modules/puppeteer-core/node_modules/https-proxy-agent": {
>       "version": "4.0.0",
>       "resolved": "https://registry.npmjs.org/https-proxy-agent/-/https-proxy-agent-4.0.0.tgz",
>       "integrity": "sha512-zoDhWrkR3of1l9QAL8/scJZyLu8j/gBkcwcaQOZh7Gyh/+uJQzGVETdgT30akuwkpL8HTRfssqI3BZuV18teDg==",
>       "dev": true,
>       "dependencies": {
>         "agent-base": "5",
>         "debug": "4"
>       },
>       "engines": {
>         "node": ">= 6.0.0"
>       }
>     },
11670,11672c11695,11700
<       "version": "5.1.1",
<       "resolved": "https://registry.npmjs.org/agent-base/-/agent-base-5.1.1.tgz",
<       "integrity": "sha512-TMeqbNl2fMW0nMjTEPOwe3J/PRFP4vqeoNuQMG0HlMrtm5QxKqdvAkZ1pRBQ/ulIyDD5Yq0nJ7YbdD8ey0TO3g=="
---
>       "version": "6.0.2",
>       "resolved": "https://registry.npmjs.org/agent-base/-/agent-base-6.0.2.tgz",
>       "integrity": "sha512-RZNwNclF7+MS/8bDg70amg32dyeZGZxiDuQmZxKLAlQjr3jGyLx+4Kkk58UO7D2QdgFIQCovuSuZESne6RG6XQ==",
>       "requires": {
>         "debug": "4"
>       }
14540,14542c14568,14570
<       "version": "4.0.0",
<       "resolved": "https://registry.npmjs.org/https-proxy-agent/-/https-proxy-agent-4.0.0.tgz",
<       "integrity": "sha512-zoDhWrkR3of1l9QAL8/scJZyLu8j/gBkcwcaQOZh7Gyh/+uJQzGVETdgT30akuwkpL8HTRfssqI3BZuV18teDg==",
---
>       "version": "5.0.0",
>       "resolved": "https://registry.npmjs.org/https-proxy-agent/-/https-proxy-agent-5.0.0.tgz",
>       "integrity": "sha512-EkYm5BcKUGiduxzSt3Eppko+PiNWNEpa4ySk9vTC6wDsQJW9rHSa+UhGNJoRYp7bz6Ht1eaRIa6QaJqO5rCFbA==",
14544c14572
<         "agent-base": "5",
---
>         "agent-base": "6",
16649a16678,16683
>         "agent-base": {
>           "version": "5.1.1",
>           "resolved": "https://registry.npmjs.org/agent-base/-/agent-base-5.1.1.tgz",
>           "integrity": "sha512-TMeqbNl2fMW0nMjTEPOwe3J/PRFP4vqeoNuQMG0HlMrtm5QxKqdvAkZ1pRBQ/ulIyDD5Yq0nJ7YbdD8ey0TO3g==",
>           "dev": true
>         },
16654a16689,16698
>         },
>         "https-proxy-agent": {
>           "version": "4.0.0",
>           "resolved": "https://registry.npmjs.org/https-proxy-agent/-/https-proxy-agent-4.0.0.tgz",
>           "integrity": "sha512-zoDhWrkR3of1l9QAL8/scJZyLu8j/gBkcwcaQOZh7Gyh/+uJQzGVETdgT30akuwkpL8HTRfssqI3BZuV18teDg==",
>           "dev": true,
>           "requires": {
>             "agent-base": "5",
>             "debug": "4"
>           }
```