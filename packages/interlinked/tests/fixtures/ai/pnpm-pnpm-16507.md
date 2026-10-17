<!-- A maintainer will only start reviewing once CodeRabbit has approved and
CI is green. Please wait for those to pass before expecting human review. -->

## Summary

After a `minimumReleaseAge` upgrade, the abbreviated metadata cache now keeps the full document's ETag and revalidates it as the full document, so registry.npmjs.org answers `304`. Before, the entry had no ETag and every revalidation of a recently published package downloaded a body.

Closes pnpm/pnpm#16506

- Root cause: the upgrade stores the full packument in the abbreviated mirror ([`persist_upgraded_to_mirror`](https://github.com/pnpm/pnpm/blob/fe4089187b/pnpm/crates/resolving-npm-resolver/src/pick_package/release_age_upgrade.rs#L188-L203), [`persistUpgradedMeta`](https://github.com/pnpm/pnpm/blob/fe4089187b/pnpm11/resolving/npm-resolver/src/releaseAgeUpgrade.ts#L143-L154)). pnpm/pnpm#15145 dropped its ETag because a full ETag cannot validate an abbreviated request. That left only `If-Modified-Since`, which npmjs.org ignores (`curl -H 'if-modified-since: …'` returns `200`, `if-none-match` returns `304`).
- Fix, same in both stacks: the mirror headers gain a `fullEtag` field, written only when the abbreviated mirror holds a full document. A fetch of that mirror asks for the full document (`Accept: application/json`) and sends `If-None-Match: <fullEtag>`. A `200` answering it is stored the same way. `etag` keeps meaning the abbreviated representation, so the two tags are never mixed, and a pnpm without this change reads the header as having no ETag, as today.
- The resolver path (`pick_package` / `pickFromRegistry`) and the lockfile verifier's abbreviated fetch (`fetch_full_metadata_cached` / `fetchFullMetadataCached`) both go through the changed request builder.

### Measurements

Local registry with per-representation ETags that honours only `If-None-Match` (like npmjs.org). Three dependencies were last published an hour ago, three a month ago. Packument requests per step. v12: dev builds of `fe4089187b` and this branch. v11: the 11.28.3 release and this branch's bundle.

| Step | Before: requests / 304 / bodies / bytes | After: requests / 304 / bodies / bytes |
| --- | --- | --- |
| `pnpm install` (no lockfile) | 9 / 0 / 9 / 18,408 | 9 / 0 / 9 / 18,408 |
| `pnpm install --frozen-lockfile` after removing `node_modules` and `lockfile-verified.jsonl` | 9 / 3 / 6 / 16,476 | 9 / 6 / 3 / 14,502 |
| `pnpm install` without a lockfile, cache dated two days back | 9 / 6 / 3 / 14,502 | 6 / 6 / 0 / 0 |

v12 and v11 give identical counts before and after. Repro: `./repro.sh <pnpm binary>` with the two files below next to each other (fixture registry, isolated `HOME`, store and cache; Node 24, macOS `date -v`).

<details><summary><code>registry.mjs</code></summary>

```js
// Fixture registry: per-representation ETags, honours If-None-Match only
// (like registry.npmjs.org, which ignores If-Modified-Since).
// Usage: node registry.mjs --port-file f --log l.jsonl
import http from 'node:http'
import fs from 'node:fs'
import zlib from 'node:zlib'
import crypto from 'node:crypto'

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, cur, i, arr) => {
  if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]])
  return acc
}, []))
const log = fs.createWriteStream(args.log, { flags: 'a' })
const DAY = 24 * 3600e3
const NOW = Number(args.now ?? Date.now())
const iso = (ms) => new Date(ms).toISOString()

// fresh-*: one mature version and one published an hour ago, so the
// abbreviated `modified` falls inside the default 1-day release-age window.
// old-*: everything published a month ago.
const packages = {}
for (let i = 0; i < 3; i++) packages[`fresh-${i}`] = [['1.0.0', NOW - 30 * DAY], ['1.1.0', NOW - 3600e3]]
for (let i = 0; i < 3; i++) packages[`old-${i}`] = [['1.0.0', NOW - 31 * DAY], ['1.1.0', NOW - 30 * DAY]]

function tarball (name, version) {
  const pkgJson = Buffer.from(JSON.stringify({ name, version }))
  const header = Buffer.alloc(512)
  header.write('package/package.json', 0)
  header.write('0000644\0', 100); header.write('0000000\0', 108); header.write('0000000\0', 116)
  header.write(pkgJson.length.toString(8).padStart(11, '0') + '\0', 124)
  header.write('00000000000\0', 136)
  header.write('        ', 148); header.write('0', 156); header.write('ustar\0', 257); header.write('00', 263)
  let sum = 0; for (const b of header) sum += b
  header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148)
  const pad = Buffer.alloc((512 - (pkgJson.length % 512)) % 512)
  return zlib.gzipSync(Buffer.concat([header, pkgJson, pad, Buffer.alloc(1024)]))
}

const tarballs = {}
const docs = {}
function build (base) {
  for (const [name, versions] of Object.entries(packages)) {
    const time = { created: iso(versions[0][1]), modified: iso(versions.at(-1)[1]) }
    const full = { name, 'dist-tags': { latest: versions.at(-1)[0] }, versions: {}, time, readme: 'x'.repeat(4000) }
    const abbrev = { name, 'dist-tags': full['dist-tags'], modified: time.modified, versions: {} }
    for (const [version, at] of versions) {
      const tgz = tarballs[`${name}-${version}`] ??= tarball(name, version)
      const dist = {
        tarball: `${base}/${name}/-/${name}-${version}.tgz`,
        integrity: 'sha512-' + crypto.createHash('sha512').update(tgz).digest('base64'),
        shasum: crypto.createHash('sha1').update(tgz).digest('hex'),
      }
      full.versions[version] = { name, version, dist, description: 'fixture' }
      abbrev.versions[version] = { name, version, dist }
      time[version] = iso(at)
    }
    for (const [variant, doc, type] of [['full', full, 'application/json'], ['abbrev', abbrev, 'application/vnd.npm.install-v1+json']]) {
      const body = Buffer.from(JSON.stringify(doc))
      docs[`${name}|${variant}`] = {
        body,
        type,
        etag: `"${variant}-${crypto.createHash('sha1').update(body).digest('hex').slice(0, 16)}"`,
        lastModified: new Date(versions.at(-1)[1]).toUTCString(),
      }
    }
  }
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  const accept = req.headers.accept ?? ''
  const rec = { method: req.method, url, inm: req.headers['if-none-match'] ?? null, ims: req.headers['if-modified-since'] ?? null }
  const done = (status, bytes, extra = {}) => { log.write(JSON.stringify({ ...rec, ...extra, status, bytes }) + '\n') }
  if (url.includes('/-/')) {
    const m = url.match(/^\/([^/]+)\/-\/(.+)\.tgz$/)
    const tgz = m && tarballs[m[2]]
    if (!tgz) { res.writeHead(404).end(); return done(404, 0, { kind: 'tarball' }) }
    res.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': tgz.length }).end(tgz)
    return done(200, tgz.length, { kind: 'tarball' })
  }
  const name = url.slice(1)
  const variant = accept.includes('application/vnd.npm.install-v1+json') ? 'abbrev' : 'full'
  const doc = docs[`${name}|${variant}`]
  if (!doc) { res.writeHead(404).end('{}'); return done(404, 0, { kind: 'packument', variant }) }
  const headers = { etag: doc.etag, 'last-modified': doc.lastModified, 'cache-control': 'public, max-age=300' }
  if (rec.inm != null && rec.inm.split(',').map(s => s.trim()).includes(doc.etag)) {
    res.writeHead(304, headers).end()
    return done(304, 0, { kind: 'packument', variant })
  }
  res.writeHead(200, { ...headers, 'content-type': doc.type, 'content-length': doc.body.length }).end(doc.body)
  done(200, doc.body.length, { kind: 'packument', variant })
})

server.listen(Number(args.port ?? 0), '127.0.0.1', () => {
  const { port } = server.address()
  build(`http://127.0.0.1:${port}`)
  fs.writeFileSync(args['port-file'], String(port))
})
```

</details>

<details><summary><code>repro.sh</code></summary>

```sh
#!/usr/bin/env bash
# Deterministic repro: a minimumReleaseAge abbreviated->full upgrade leaves the
# metadata mirror without a usable ETag, so the next revalidation of that
# package downloads a body instead of getting a 304.
# Usage: ./repro.sh <pnpm binary> [label]
set -euo pipefail
BIN=$1; LABEL=${2:-$(basename "$BIN")}
HERE=$(cd "$(dirname "$0")" && pwd)
T="$HERE/runs/$LABEL"; rm -rf "$T"; mkdir -p "$T/proj" "$T/home" "$T/logs"
PID=
trap 'kill "${PID:-}" 2>/dev/null || true' EXIT
node "$HERE/registry.mjs" --port-file "$T/port" --log "$T/logs/registry.jsonl" & PID=$!
for _ in $(seq 1 100); do [ -s "$T/port" ] && break; sleep 0.1; done
PORT=$(cat "$T/port")
cat > "$T/proj/package.json" <<EOF
{ "name": "proj", "version": "1.0.0", "dependencies": { "fresh-0": "^1.0.0", "fresh-1": "^1.0.0", "fresh-2": "^1.0.0", "old-0": "^1.0.0", "old-1": "^1.0.0", "old-2": "^1.0.0" } }
EOF
printf 'enableGlobalVirtualStore: false\n' > "$T/proj/pnpm-workspace.yaml"
mark() { echo "{\"phase\":\"$1\"}" >> "$T/logs/registry.jsonl"; }
run() {
  (cd "$T/proj" && env -i PATH="$PATH" TERM=dumb HOME="$T/home" \
    XDG_CONFIG_HOME="$T/home/.config" XDG_CACHE_HOME="$T/home/.cache" XDG_DATA_HOME="$T/home/.local/share" XDG_STATE_HOME="$T/home/.local/state" \
    npm_config_registry="http://127.0.0.1:$PORT/" pnpm_config_registry="http://127.0.0.1:$PORT/" \
    npm_config_store_dir="$T/store" pnpm_config_store_dir="$T/store" npm_config_cache_dir="$T/cache" pnpm_config_cache_dir="$T/cache" \
    "$BIN" "$@" --reporter=append-only) >> "$T/logs/pnpm.out" 2>&1
}
echo "== $LABEL: pnpm $(cd /tmp && "$BIN" --version)"
mark resolve; run install
echo "mirror headers after resolve:"
for f in $(find "$T/cache" -path '*metadata/*' -name 'fresh-0.jsonl' -o -path '*metadata/*' -name 'old-0.jsonl' | sort); do
  printf '  %s: %s\n' "$(basename "$(dirname "$(dirname "$(dirname "$f")")")")/$(basename "$(dirname "$(dirname "$f")")")/$(basename "$f")" "$(head -c 400 "$f" | tr '\n' ' ' | grep -o '{"[^}]*}' | head -1)"
done
# Scenario A: after a git pull, reinstall from the lockfile.
rm -rf "$T/proj/node_modules" "$T/cache/lockfile-verified.jsonl"
mark reverify; run install --frozen-lockfile
# Scenario B: re-resolve a day later (mirrors older than the release-age cutoff).
rm -rf "$T/proj/node_modules" "$T/proj/pnpm-lock.yaml" "$T/cache/lockfile-verified.jsonl"
find "$T/cache" -name '*.jsonl' -exec touch -t "$(date -v-2d +%Y%m%d%H%M)" {} +
mark re-resolve; run install
node - "$T/logs/registry.jsonl" <<'EOF'
const lines = require('fs').readFileSync(process.argv[2], 'utf8').trim().split('\n').map(JSON.parse)
let phase, out = {}
for (const l of lines) {
  if (l.phase) { phase = l.phase; out[phase] = { req: 0, '304': 0, bodies: 0, bodyBytes: 0, detail: [] }; continue }
  if (l.kind !== 'packument') continue
  const o = out[phase]; o.req++
  if (l.status === 304) o['304']++
  if (l.status === 200) { o.bodies++; o.bodyBytes += l.bytes }
  if (l.url.startsWith('/fresh-0')) o.detail.push(`${l.variant}${l.inm ? ' inm' : ''}${l.ims ? ' ims' : ''} -> ${l.status}`)
}
for (const [p, o] of Object.entries(out)) console.log(`${p.padEnd(10)} packument requests=${o.req} 304=${o['304']} bodies=${o.bodies} bodyBytes=${o.bodyBytes}  fresh-0: ${o.detail.join(', ')}`)
EOF
grep -iE 'ERR|error' "$T/logs/pnpm.out" | head -5 || true
```

</details>

### Proof per stack

- v12: `pnpm test:rust -p pnpm-resolving-npm-resolver` passes, 574 tests. With the `src` changes reverted in the working tree, `published_by_upgraded_mirror_revalidates_with_the_full_etag` fails: the second install sends a second abbreviated request (`Expected 1 request(s) … but received 2`). `published_by_upgraded_mirror_records_a_changed_full_document_as_full` pins that a changed full document is stored as `fullEtag`, never as `etag`.
- v11: `jest` in `pnpm11/resolving/npm-resolver` passes, 501 tests. With the `src` changes reverted, `publishedBy.test.ts` fails 3 of 31: the new revalidation test (its `304` interceptor is never used) and the two upgrade tests that now expect `fullEtag`.
- Also ran: `rustfmt` check, `cargo clippy -p pnpm-resolving-npm-resolver --all-targets -D warnings`, `cargo doc` with `-D warnings`, `cargo dylint -p pnpm-resolving-npm-resolver`, eslint, cspell and typos on the changed files.

### Not verified

- Live registry.npmjs.org: only the `curl` behaviour above, no end-to-end install against it.
- The frozen reinstall still downloads the full document of each fresh package once. The lockfile verifier reads `time` only from the `metadata-full` cache, not from the upgraded abbreviated entry. That is a separate change.

## Squash Commit Body

```text
A minimumReleaseAge upgrade stores the full packument in the abbreviated
metadata mirror. The full document's ETag cannot validate an abbreviated
request, so the mirror kept no ETag and the next fetch could only send
If-Modified-Since. registry.npmjs.org ignores that header, so every
revalidation of a recently published package downloaded a body, and the
abbreviated body that replaced the cached full document triggered the
upgrade again.

The mirror headers gain a fullEtag field, written only when the
abbreviated mirror holds a full document. A fetch of that mirror asks for
the full document with If-None-Match set to that tag, and a 200 answering
it is stored the same way. etag keeps describing the abbreviated
representation, so the two validators never mix, and an older pnpm reads
such a header as having no ETag.

Both the Rust and TypeScript resolvers change, including the lockfile
verifier's abbreviated fetch, which shares the request builder.

Closes pnpm/pnpm#16506
```

## Checklist

- [x] I checked the referenced issue and verified that none of the PRs
  already linked to it solves it.
- [x] New features are implemented only in the Rust pnpm v12 CLI. Bug fixes
  are implemented in every affected version.
- [x] Added a changeset (`pnpm changeset`) if this PR changes any published
  package. Keep it short and written for pnpm users — it becomes a release note.
- [x] Added or updated tests.

---
Written by an agent (Claude Code, Opus 5.5).

<!-- codesmith:footer -->
---
<a href="https://app.blacksmith.sh/pnpm/codesmith/pnpm/pr/16507?autoLogin=true&ref=codesmith_pr_footer"><picture><source media="(prefers-color-scheme: dark)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/view-with-codesmith-dark-v2.svg"><source media="(prefers-color-scheme: light)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/view-with-codesmith-light-v2.svg"><img alt="View with [code]smith" src="https://pr-comments-assets.blacksmith.sh/codesmith/view-with-codesmith-dark-v2.svg"></picture></a> <a href="https://backend.blacksmith.sh/track/enable-autofix?expires=1793482181&installation_model_id=426870&pr_number=16507&ref=codesmith_pr_footer&repository=pnpm%2Fpnpm&return_to=https%3A%2F%2Fgithub.com%2Fpnpm%2Fpnpm%2Fpull%2F16507&signature=caecc971c6b50d881e318596058bf084a5b7dcad62960d3023044f10a37ca7a0"><picture><source media="(prefers-color-scheme: dark)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/autofix-with-codesmith-dark.svg"><source media="(prefers-color-scheme: light)" srcset="https://pr-comments-assets.blacksmith.sh/codesmith/autofix-with-codesmith-light.svg"><img alt="Autofix with [code]smith" src="https://pr-comments-assets.blacksmith.sh/codesmith/autofix-with-codesmith-dark.svg"></picture></a>
<sup>Need help on this PR? Tag <code>@codesmith-bot</code> with what you need. Autofix is disabled.</sup>

<!-- codesmith:autofix:disabled -->
<!-- /codesmith:footer -->

<!-- This is an auto-generated comment: release notes by coderabbit.ai -->
## Summary by CodeRabbit

* **Bug Fixes**
  * Cached package metadata is revalidated with the correct ETag after a `minimumReleaseAge` upgrade. When the registry reports no changes, installs can reuse the cached document instead of downloading it again.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->
