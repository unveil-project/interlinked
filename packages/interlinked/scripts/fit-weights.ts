import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { measure } from '../src/measure'
import { SIGNALS, type Signal } from '../src/signals'
import type { CorpusEntry } from './build-corpus'

const ROOT = join(import.meta.dirname, '..')
const FIXTURES_DIR = join(ROOT, 'tests', 'fixtures')
const LABEL_SIGNALS = new Set(['agent-attribution', 'ai-disclosure'])
const FOLDS = 5
const LAMBDAS = [0.00003, 0.0001, 0.0003, 0.001]
const MAX_WEIGHT = 4
const MIN_SUPPORT = 30
const TARGET_FPR = 0.03

const labelSignals = SIGNALS.filter((s) => LABEL_SIGNALS.has(s.id))
const candidates = SIGNALS.filter((s) => !LABEL_SIGNALS.has(s.id))

/** Where a text came from. Only for reporting: every text is scored the same way. */
type Source = NonNullable<CorpusEntry['kind']> | 'fixture'
const SOURCES: Source[] = ['pr', 'issue', 'comment', 'fixture']

interface Example {
  /** Texts that share a writer: the author for agent accounts, else the repo. */
  group: string
  source: Source
  y: 0 | 1
  /** Strength per candidate signal. */
  all: number[]
  /** Strength per fitted signal. */
  x: number[]
  /** Logit from the hand-weighted signals. */
  offset: number
}

function discloses(text: string) {
  return labelSignals.some((s) => s.count(text) > 0)
}

function toExample(
  group: string,
  source: Source,
  label: 'ai' | 'human',
  body: string,
  template?: string | string[],
): Example {
  const authored = body
    .split('\n')
    .filter((line) => !discloses(line))
    .join('\n')
  const strengths = new Map(
    measure(authored, template, candidates).map((m) => [
      m.signal.id,
      m.strength,
    ]),
  )
  return {
    group,
    source,
    y: label === 'ai' ? 1 : 0,
    all: candidates.map((s) => strengths.get(s.id) ?? 0),
    x: [],
    offset: 0,
  }
}

/**
 * Hand-reviewed fixtures, labelled by folder. Their repo is the file name minus
 * the PR, issue or comment number.
 */
function loadFixtures(): (CorpusEntry & { template?: string })[] {
  const fixtures: (CorpusEntry & { template?: string })[] = []
  for (const label of ['ai', 'human'] as const) {
    const dir = join(FIXTURES_DIR, label)
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.md') || file.endsWith('.template.md')) {
        continue
      }
      const templatePath = join(dir, file.replace(/\.md$/, '.template.md'))
      const name = file.replace(/\.md$/, '')
      fixtures.push({
        label,
        repo: name.replace(/-\d+$/, ''),
        number: Number(name.match(/-(\d+)$/)?.[1] ?? 0),
        body: readFileSync(join(dir, file), 'utf-8'),
        template: existsSync(templatePath)
          ? readFileSync(templatePath, 'utf-8')
          : undefined,
      })
    }
  }
  return fixtures
}

function readCorpus<T>(file: string, fallback: T): T {
  const path = join(ROOT, 'corpus', file)
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf-8')) : fallback
}

function load(): Example[] {
  const entries: CorpusEntry[] = [
    ...readCorpus<CorpusEntry[]>('entries.json', []),
    ...readCorpus<CorpusEntry[]>('issues.json', []),
  ]
  const templates: Record<string, string> = readCorpus('templates.json', {})
  const issueTemplates: Record<string, string[]> = readCorpus(
    'issue-templates.json',
    {},
  )
  const fixtures = loadFixtures()
  // A reviewed fixture overrides the corpus label for the same text.
  const fixtureNames = new Set(fixtures.map((f) => `${f.repo}-${f.number}`))
  const fixtureBodies = new Set(fixtures.map((f) => f.body.trim()))

  const examples: Example[] = []
  for (const entry of entries) {
    const kind = entry.kind ?? 'pr'
    if (
      (kind === 'pr' &&
        fixtureNames.has(`${entry.repo.replace('/', '-')}-${entry.number}`)) ||
      fixtureBodies.has(entry.body.trim())
    ) {
      continue
    }
    // Comments have no template.
    const template =
      kind === 'pr'
        ? templates[entry.repo]
        : kind === 'issue'
          ? issueTemplates[entry.repo]
          : undefined
    // Recheck labels with the current tells and skip mismatches. An agent
    // account's text is agent-written whether it discloses or not.
    const disclosed = measure(entry.body, template, labelSignals).length > 0
    if (
      entry.source !== 'agent-account' &&
      disclosed !== (entry.label === 'ai')
    ) {
      continue
    }
    examples.push(
      toExample(
        entry.source === 'agent-account' && entry.author
          ? `@${entry.author}`
          : entry.repo,
        kind,
        entry.label,
        entry.body,
        template,
      ),
    )
  }
  for (const fixture of fixtures) {
    examples.push(
      toExample(
        fixture.repo,
        'fixture',
        fixture.label,
        fixture.body,
        fixture.template,
      ),
    )
  }
  return examples
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z))

function logit(w: number[], bias: number, e: Example) {
  return e.x.reduce((z, xi, j) => z + xi * w[j], bias + e.offset)
}

function score(w: number[], bias: number, e: Example) {
  return sigmoid(logit(w, bias, e))
}

/**
 * Logistic regression with balanced classes, fixed signs and L2
 * regularization, starting from `start`.
 */
function fitWeights(
  examples: Example[],
  lambda: number,
  start: number[],
  signs: number[],
) {
  const positives = examples.filter((e) => e.y === 1).length
  const weightOf = (e: Example) =>
    e.y === 1 ? 0.5 / positives : 0.5 / (examples.length - positives)

  const w = [...start]
  let bias = 0
  // Adam over the full batch.
  const m = new Array(w.length + 1).fill(0)
  const v = new Array(w.length + 1).fill(0)
  for (let t = 1; t <= 3000; t++) {
    const grad = new Array(w.length + 1).fill(0)
    for (const e of examples) {
      const err = (score(w, bias, e) - e.y) * weightOf(e)
      for (let j = 0; j < w.length; j++) {
        grad[j] += err * e.x[j]
      }
      grad[w.length] += err
    }
    for (let j = 0; j < w.length; j++) {
      grad[j] += 2 * lambda * w[j]
    }
    for (let j = 0; j <= w.length; j++) {
      m[j] = 0.9 * m[j] + 0.1 * grad[j]
      v[j] = 0.999 * v[j] + 0.001 * grad[j] ** 2
      const step =
        (0.02 * (m[j] / (1 - 0.9 ** t))) /
        (Math.sqrt(v[j] / (1 - 0.999 ** t)) + 1e-8)
      if (j === w.length) {
        bias -= step
      } else {
        const next = w[j] - step
        // Keep the original sign and stay within MAX_WEIGHT.
        w[j] =
          signs[j] > 0
            ? Math.min(Math.max(next, 0), MAX_WEIGHT)
            : Math.max(Math.min(next, 0), -MAX_WEIGHT)
      }
    }
  }
  return { w, bias }
}

/** One logit per example, same order. */
type Logits = number[]

/**
 * Assigns folds by group, so all of a repo's texts share a fold, and so do an
 * agent account's across repos.
 */
function foldOf(examples: Example[]) {
  const groups = [...new Set(examples.map((e) => e.group))].sort()
  const folds = new Map(groups.map((g, i) => [g, i % FOLDS]))
  return examples.map((e) => folds.get(e.group) ?? 0)
}

/** Each example's logit from a model fitted without its repo. */
function outOfFold(
  examples: Example[],
  lambda: number,
  start: number[],
  signs: number[],
): Logits {
  const folds = foldOf(examples)
  const logits: Logits = new Array(examples.length).fill(0)
  for (let k = 0; k < FOLDS; k++) {
    const { w, bias } = fitWeights(
      examples.filter((_, i) => folds[i] !== k),
      lambda,
      start,
      signs,
    )
    examples.forEach((e, i) => {
      if (folds[i] === k) {
        logits[i] = logit(w, bias, e)
      }
    })
  }
  return logits
}

/** Logits of one class, highest first. */
function logitsOf(examples: Example[], logits: Logits, y: 0 | 1) {
  return logits.filter((_, i) => examples[i].y === y).sort((a, b) => b - a)
}

/** Logit where a share `fpr` of human examples score above. */
function thresholdAt(examples: Example[], logits: Logits, fpr: number) {
  const humans = logitsOf(examples, logits, 0)
  if (humans.length === 0) {
    throw new Error('no human examples to set a threshold on')
  }
  return humans[Math.min(Math.floor(fpr * humans.length), humans.length - 1)]
}

/** Chance a random agent text scores above a random human one. */
function auc(examples: Example[], logits: Logits) {
  const humans = logitsOf(examples, logits, 0)
  const ais = logitsOf(examples, logits, 1)
  let wins = 0
  for (const a of ais) {
    for (const h of humans) {
      wins += a > h ? 1 : a === h ? 0.5 : 0
    }
  }
  return wins / (ais.length * humans.length)
}

/**
 * The logit at which no source's human texts score above it more often than
 * `fpr`, so one threshold is safe for PRs, issues and comments alike.
 */
function safeThreshold(examples: Example[], logits: Logits, fpr: number) {
  return Math.max(
    ...(['pr', 'issue', 'comment'] as const).map((source) => {
      const of = examples.flatMap((e, i) => (e.source === source ? [i] : []))
      return thresholdAt(
        of.map((i) => examples[i]),
        of.map((i) => logits[i]),
        fpr,
      )
    }),
  )
}

/** AUC, and false-positive rate and recall at threshold `t`, overall and by source. */
function report(name: string, examples: Example[], logits: Logits, t: number) {
  const rows = [undefined, ...SOURCES].map((source) => {
    const of = examples.flatMap((e, i) =>
      source === undefined || e.source === source ? [i] : [],
    )
    const sub = of.map((i) => examples[i])
    const subLogits = of.map((i) => logits[i])
    const share = (y: 0 | 1) => {
      const xs = logitsOf(sub, subLogits, y)
      return pct(xs.filter((x) => x >= t).length / xs.length)
    }
    return `${(source ?? 'all').padEnd(8)} AUC ${auc(sub, subLogits).toFixed(3)}  FPR ${share(0).padStart(6)}  recall ${share(1).padStart(6)}`
  })
  console.log(`${name}\n  ${rows.join('\n  ')}`)
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`
}

function writeWeights(fitted: Signal[], w: number[], bias: number) {
  const signalsPath = join(ROOT, 'src', 'signals.ts')
  let source = readFileSync(signalsPath, 'utf-8')
  fitted.forEach((signal, j) => {
    const pattern = new RegExp(`(id: "${signal.id}",\\n[^]*?weight: )-?[\\d.]+`)
    source = source.replace(pattern, `$1${round(w[j])}`)
  })
  writeFileSync(signalsPath, source)

  const scorePath = join(ROOT, 'src', 'score.ts')
  writeFileSync(
    scorePath,
    readFileSync(scorePath, 'utf-8').replace(
      /(const BIAS = )-?[\d.]+/,
      `$1${round(bias)}`,
    ),
  )
}

function round(n: number) {
  return Math.round(n * 100) / 100
}

/** The fitted bias in `src/score.ts`. */
function currentBias() {
  const source = readFileSync(join(ROOT, 'src', 'score.ts'), 'utf-8')
  const match = source.match(/const BIAS = (-?[\d.]+)/)
  if (!match) {
    throw new Error('src/score.ts has no `const BIAS = <number>;`')
  }
  return Number(match[1])
}

const examples = load()
const support = candidates.map(
  (_, j) => examples.filter((e) => e.all[j] > 0).length,
)
const fitted = candidates.filter((_, j) => support[j] >= MIN_SUPPORT)
const fixed = candidates.filter((_, j) => support[j] < MIN_SUPPORT)
for (const e of examples) {
  e.x = candidates.flatMap((_, j) =>
    support[j] >= MIN_SUPPORT ? [e.all[j]] : [],
  )
  e.offset = candidates.reduce(
    (z, s, j) => (support[j] < MIN_SUPPORT ? z + s.weight * e.all[j] : z),
    0,
  )
}
const counts = SOURCES.map(
  (source) =>
    `${source} ${examples.filter((e) => e.source === source && e.y === 0).length}/${examples.filter((e) => e.source === source && e.y === 1).length}`,
)
console.log(
  `${examples.length} texts (human/ai): ${counts.join(', ')}; ${new Set(examples.map((e) => e.group)).size} repos and agent accounts`,
)
console.log(
  `hand weights kept (< ${MIN_SUPPORT} texts): ${fixed.map((s) => s.id).join(', ')}\n`,
)

const before = currentBias()
const start = fitted.map((s) => s.weight)
const signs = fitted.map((s) => Math.sign(s.weight))
report(
  'current (at 0.5)',
  examples,
  examples.map((e) => logit(start, before, e)),
  0,
)

// Pick the λ with the best out-of-fold recall at TARGET_FPR.
const best = LAMBDAS.map((lambda) => {
  const logits = outOfFold(examples, lambda, start, signs)
  const t = safeThreshold(examples, logits, TARGET_FPR)
  report(
    `fit λ=${lambda}, out of fold, at ${pct(TARGET_FPR)} FPR`,
    examples,
    logits,
    t,
  )
  const recall = logitsOf(examples, logits, 1).filter((l) => l >= t).length
  return { lambda, logits, recall }
}).reduce((a, b) => (b.recall > a.recall ? b : a))

// Fit on all data, then shift the bias so TARGET_FPR lands at 0.5.
const { w, bias: fittedBias } = fitWeights(examples, best.lambda, start, signs)
const bias = fittedBias - safeThreshold(examples, best.logits, TARGET_FPR)
report(
  'chosen (in-sample, at 0.5)',
  examples,
  examples.map((e) => logit(w, bias, e)),
  0,
)
console.log(
  `\nλ=${best.lambda}, bias ${before} -> ${round(bias)} (calibrated to ${pct(TARGET_FPR)} FPR in each source)`,
)
const humans = examples.filter((e) => e.y === 0).length
console.table(
  fitted
    .map((s, j) => {
      const fires = examples.filter((e) => e.x[j] > 0)
      return {
        id: s.id,
        before: s.weight,
        after: round(w[j]),
        'fires human': pct(fires.filter((e) => e.y === 0).length / humans),
        'fires ai': pct(
          fires.filter((e) => e.y === 1).length / (examples.length - humans),
        ),
      }
    })
    .sort((a, b) => b.after - a.after),
)

if (process.argv.includes('--write')) {
  writeWeights(fitted, w, bias)
  console.log('wrote weights to src/signals.ts and src/score.ts')
}
