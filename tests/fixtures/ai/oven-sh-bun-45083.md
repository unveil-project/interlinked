### What is the problem this feature would solve?

Compiling the same source again with `new vm.Script()` is normally served from JSC's `CodeCache`. Its working set is capped at 2,000 entries / 16 MB (`workingSetMaxEntries` and `workingSetMaxBytes` in `Source/JavaScriptCore/runtime/CodeCache.h`). When a loader cycles through more distinct sources than that, every compile misses. A test runner that re-evaluates a large module graph for each test file does exactly that. Node keeps its cache hits at these sizes. OpenClaw's test files load module graphs of about 2,100 modules, just past the limit.

Save as `vm-cache.cjs` and run `node vm-cache.cjs <N>` and `bun vm-cache.cjs <N>`:

```js
const { Script } = require('node:vm');
const n = Number(process.argv[2] ?? 2500);
const sources = Array.from({ length: n }, (_, i) =>
  `(function(){${Array.from({ length: 20 }, (_, j) => `function f${j}(){return ${i + j}}`).join(';')};return f0()})()`);
const ms = [];
for (let pass = 0; pass < 5; pass++) {
  const start = performance.now();
  for (let i = 0; i < n; i++) new Script(sources[i], { filename: `module-${i}.js` }).runInThisContext();
  ms.push(Math.round(performance.now() - start));
}
console.log(n, JSON.stringify(ms));
```

Milliseconds per pass: cold is the first pass; warm is the median of passes 1–4 over three runs. These ran on macOS arm64 on a loaded machine, so the absolute numbers are rough, but the pattern held across reruns:

| distinct sources | Bun 1.4.3 cold / warm | Node 24.21.0 cold / warm |
| ---: | ---: | ---: |
| 1,000 | 17 / 2 | 16 / 2 |
| 2,000 | 32 / 5 | 32 / 4 |
| 2,100 | 35 / 15 | 35 / 4 |
| 2,500 | 43 / 34 | 40 / 5 |
| 4,000 | 67 / 68 | 65 / 6 |

### What is the feature you are proposing to solve the problem?

Keep repeated `node:vm` compiles cached for graphs above 2,000 sources. There are two ways:

1. Raise, adapt or expose the `CodeCache` working-set limits in oven-sh/WebKit. The change is small; the cost is more memory per VM.
2. Add a bounded cache for `node:vm` in Bun. OpenClaw's fork does this in [openclaw/bun#85](https://github.com/openclaw/bun/pull/85): a 256 MiB byte-bounded LRU per VM, enabled after 1,750 distinct sources and keyed on the full source plus filename, offsets and compile options. Our measurements, not rerun on current upstream: warm replay went from 191.6 to 52.6 ms at 2,500 modules and from 371.4 to 85.1 ms at 4,000, at a cost of about 0.5 µs per compile (+3.5%) at 500 modules. On two OpenClaw test files, median time improved 10.9% and 2.6%; peak RSS rose 2.7% on the second.

Decision needed: is this worth fixing, and if so, in JSC's cache or in Bun?

### What alternatives have you considered?

Callers could keep their own `vm.Script` objects, but every loader would have to change. Leaving it as is keeps the slowdown past 2,000 sources.
