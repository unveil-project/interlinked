Closes #4938

Adds `hono/wintertc-sockets`, an adapter that serves a Hono app over sockets implementing the [WinterTC Sockets API](https://sockets-api.proposal.wintertc.org/).

The spec only defines `connect()` and has no listen or accept API. So the runtime accepts connections and hands each socket (`{ readable, writable, opened, close }`) to the adapter. The adapter parses HTTP/1.1 from `socket.readable`, runs `app.fetch()`, and writes the response to `socket.writable`.

```ts
import { Hono } from 'hono'
import { createSocketHandler, getConnInfo } from 'hono/wintertc-sockets'

const app = new Hono()
app.get('/', (c) => c.text(`Hello ${getConnInfo(c).remote.address}`))

const handle = createSocketHandler(app)
// for each accepted connection:
handle({ readable, writable, opened, close })
```

### What's included
- `serveSocket(app, socket, options?)` / `createSocketHandler(app, options?)`
- A dependency-free HTTP/1.1 codec:
  - Request bodies with `Content-Length` or `Transfer-Encoding: chunked`. A body sent with GET or HEAD is consumed but not exposed.
  - Keep-alive and pipelining. Unread request bodies are skipped before the next request.
  - `Expect: 100-continue`, sent only when the app reads the body.
  - HTTP/1.0: close-delimited responses, and `Connection: keep-alive` when the response length is known.
  - Chunked responses when the length is unknown. No body for HEAD, 1xx, 204 or 304. Each `Set-Cookie` on its own line.
  - Malformed requests get 400 / 431 / 501 / 505 and the connection is closed. Requests with both `Content-Length` and `Transfer-Encoding`, or with conflicting `Content-Length` values, are rejected.
- `c.env.socket` and `c.env.info`, plus `getConnInfo()` that parses `SocketInfo.remoteAddress` (`host:port` or `[v6]:port`)
- Options: `scheme`, `maxHeaderSize` (default 16 KiB), `keepAlive`, `env`

### Not supported
TLS/`startTls()`, HTTP/2, protocol upgrades (WebSocket), request trailers (they are read and discarded).

### Notes
- The other adapters in `src/adapter` are deprecated in favor of `adapters/*` packages for v5. I'm happy to move this to `adapters/wintertc-sockets` if you prefer.
- Tested end to end with a Node `net` server wrapped through `Duplex.toWeb()`, using curl: GET, POST, a 300 KB chunked upload, `--http1.0`, connection reuse and HEAD.

### The author should do the following, if applicable

- [x] Add tests
- [x] Run tests
- [x] `pnpm run check:fix` to format and lint the code
- [x] Add [TSDoc](https://tsdoc.org/)/[JSDoc](https://jsdoc.app/about-getting-started) to document the code

🤖 Generated with [Claude Code](https://claude.com/claude-code)
