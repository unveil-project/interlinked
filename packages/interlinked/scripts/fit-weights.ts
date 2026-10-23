import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { measure } from '../src/measure'
import { SIGNALS, type Signal } from '../src/signals'
import { round, sigmoid } from '../src/utils'
import {
  type CorpusEntry,
  type PolicyEntry,
  type PolicyTemplates,
  readCorpus,
} from './corpus'
import { readFixtures } from './fixtures'

const ROOT = join(import.meta.dirname, '..')
const LABEL_SIGNALS = new Set(['agent-attribution', 'ai-disclosure'])
const FOLDS = 5
const LAMBDAS = [0.00003, 0.0001, 0.0003, 0.001]
const MAX_WEIGHT = 4
/** Signals firing on fewer texts keep their hand-set weight. */
const MIN_SUPPORT = 30
const TARGET_FPR = 0.03
/** Lower, because the next repo it runs on is a new one. */
const POLICY_TARGET_FPR = 0.02
/** Share of the human side's weight for text under a no-AI policy. */
const POLICY_SHARE = Number(process.env.POLICY_SHARE ?? 0.5)
/** Fewest human texts a group needs to set the threshold. */
const MIN_POOL = 100

const labelSignals = SIGNALS.filter((s) => LABEL_SIGNALS.has(s.id))
const candidates = SIGNALS.filter((s) => !LABEL_SIGNALS.has(s.id))

type Kind = NonNullable<CorpusEntry['kind']>
type Source = Kind | 'fixture'
const KINDS: Kind[] = ['pr', 'issue', 'comment']
const SOURCES: Source[] = [...KINDS, 'fixture']

interface Example {
  /** Shares a fold: the author for agent accounts and policy texts, else the repo. */
  group: string
  source: Source
  y: 0 | 1
  /** Strength per candidate signal. */
  all: number[]
  /** Strength per fitted signal. */
  x: number[]
  /** Logit from the hand-weighted signals. */
  offset: number
  policy?: 'fitted' | 'holdout'
}

function discloses(text: string, template?: string | string[]) {
  return measure(text, template, labelSignals).length > 0
}

function toExample(
  group: string,
  source: Source,
  label: 'ai' | 'human',
  body: string,
  template?: string | string[],
  policy?: Example['policy'],
): Example {
  const withoutDisclosures = body
    .split('\n')
    .filter((line) => !labelSignals.some((s) => s.count(line) > 0))
    .join('\n')
  const strengths = new Map(
    measure(withoutDisclosures, template, candidates).map((m) => [
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
    policy,
  }
}

function templateFor<T>(kind: Kind, pr?: T, issue?: T) {
  if (kind === 'pr') {
    return pr
  }
  return kind === 'issue' ? issue : undefined
}

function load() {
  const fixtures = readFixtures().map((fixture) => ({
    ...fixture,
    repo: fixture.name.replace(/-\d+$/, ''),
    number: Number(fixture.name.match(/-(\d+)$/)?.[1] ?? 0),
  }))
  const fixtureNames = new Set(fixtures.map((f) => `${f.repo}-${f.number}`))
  const fixtureBodies = new Set(fixtures.map((f) => f.body.trim()))
  const isFixture = (entry: CorpusEntry, kind: Kind) =>
    (kind === 'pr' &&
      fixtureNames.has(`${entry.repo.replace('/', '-')}-${entry.number}`)) ||
    fixtureBodies.has(entry.body.trim())

  const templates = readCorpus<Record<string, string>>('templates.json', {})
  const issueTemplates = readCorpus<Record<string, string[]>>(
    'issue-templates.json',
    {},
  )
  const policyTemplates = readCorpus<Record<string, PolicyTemplates>>(
    'policy-templates.json',
    {},
  )
  const entries = [
    ...readCorpus<CorpusEntry[]>('entries.json', []),
    ...readCorpus<CorpusEntry[]>('issues.json', []),
  ]

  const examples: Example[] = []
  const holdout: Example[] = []

  for (const entry of entries) {
    const kind = entry.kind ?? 'pr'
    if (isFixture(entry, kind)) {
      continue
    }
    const template = templateFor<string | string[]>(
      kind,
      templates[entry.repo],
      issueTemplates[entry.repo],
    )
    // Agent accounts' text is ai either way; the rest must match the tells.
    const labelMatches =
      discloses(entry.body, template) === (entry.label === 'ai')
    if (!entry.fromAgentAccount && !labelMatches) {
      continue
    }
    const group =
      entry.fromAgentAccount && entry.author ? `@${entry.author}` : entry.repo
    examples.push(toExample(group, kind, entry.label, entry.body, template))
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

  for (const entry of readCorpus<PolicyEntry[]>('policy.json', [])) {
    const kind = entry.kind ?? 'pr'
    const repoTemplates = policyTemplates[entry.repo]
    const template = templateFor<string | string[]>(
      kind,
      repoTemplates?.pr,
      repoTemplates?.issues,
    )
    // Mentions of the policy itself read as a disclosure.
    if (discloses(entry.body, template)) {
      continue
    }
    const policy = entry.holdout ? 'holdout' : 'fitted'
    const example = toExample(
      `@${entry.author}`,
      kind,
      'human',
      entry.body,
      template,
      policy,
    )
    ;(entry.holdout ? holdout : examples).push(example)
  }

  return { examples, holdout }
}

function logit(w: number[], bias: number, e: Example) {
  return e.x.reduce((z, xi, j) => z + xi * w[j], bias + e.offset)
}

/** Clamps to `[0, MAX_WEIGHT]` or `[-MAX_WEIGHT, 0]` by sign. Sign 0 stays off. */
function keepSign(weight: number, sign: number) {
  if (sign > 0) {
    return Math.min(Math.max(weight, 0), MAX_WEIGHT)
  }
  if (sign < 0) {
    return Math.max(Math.min(weight, 0), -MAX_WEIGHT)
  }
  return 0
}

/** Logistic regression with balanced classes, fixed signs and L2, by full-batch Adam. */
function fitWeights(
  examples: Example[],
  lambda: number,
  start: number[],
  signs: number[],
) {
  const positives = examples.filter((e) => e.y === 1).length
  const recent = examples.filter((e) => e.y === 0 && e.policy).length
  const older = examples.length - positives - recent
  const recentShare = recent > 0 ? POLICY_SHARE : 0
  const weightOf = (e: Example) => {
    if (e.y === 1) {
      return 0.5 / positives
    }
    if (e.policy) {
      return (0.5 * recentShare) / recent
    }
    return (0.5 * (1 - recentShare)) / older
  }

  const w = [...start]
  let bias = 0
  const n = w.length + 1
  const m = new Array(n).fill(0)
  const v = new Array(n).fill(0)
  for (let t = 1; t <= 3000; t++) {
    const grad = new Array(n).fill(0)
    for (const e of examples) {
      const err = (sigmoid(logit(w, bias, e)) - e.y) * weightOf(e)
      for (let j = 0; j < w.length; j++) {
        grad[j] += err * e.x[j]
      }
      grad[w.length] += err
    }
    for (let j = 0; j < w.length; j++) {
      grad[j] += 2 * lambda * w[j]
    }
    for (let j = 0; j < n; j++) {
      m[j] = 0.9 * m[j] + 0.1 * grad[j]
      v[j] = 0.999 * v[j] + 0.001 * grad[j] ** 2
      const step =
        (0.02 * (m[j] / (1 - 0.9 ** t))) /
        (Math.sqrt(v[j] / (1 - 0.999 ** t)) + 1e-8)
      if (j === w.length) {
        bias -= step
      } else {
        w[j] = keepSign(w[j] - step, signs[j])
      }
    }
  }
  return { w, bias }
}

/** By group, so a repo's or an author's texts share a fold. */
function foldOf(examples: Example[]) {
  const groups = [...new Set(examples.map((e) => e.group))].sort()
  const folds = new Map(groups.map((g, i) => [g, i % FOLDS]))
  return examples.map((e) => folds.get(e.group) ?? 0)
}

/** Each example's logit from a model fitted without its fold. */
function outOfFold(
  examples: Example[],
  lambda: number,
  start: number[],
  signs: number[],
) {
  const folds = foldOf(examples)
  const logits: number[] = new Array(examples.length).fill(0)
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
function logitsOf(examples: Example[], logits: number[], y: 0 | 1) {
  return logits.filter((_, i) => examples[i].y === y).sort((a, b) => b - a)
}

/** The logit a share `fpr` of human examples score above. */
function thresholdAt(examples: Example[], logits: number[], fpr: number) {
  const humans = logitsOf(examples, logits, 0)
  if (humans.length === 0) {
    throw new Error('no human examples to set a threshold on')
  }
  return humans[Math.min(Math.floor(fpr * humans.length), humans.length - 1)]
}

/** Chance a random agent logit is above a random human one, ties counting half. */
function auc(ais: number[], humans: number[]) {
  const all = [
    ...ais.map((x) => ({ x, ai: true })),
    ...humans.map((x) => ({ x, ai: false })),
  ].sort((a, b) => a.x - b.x)
  let rankSum = 0
  for (let i = 0; i < all.length;) {
    let j = i
    while (j < all.length && all[j].x === all[i].x) {
      j++
    }
    const meanRank = (i + 1 + j) / 2
    for (let k = i; k < j; k++) {
      if (all[k].ai) {
        rankSum += meanRank
      }
    }
    i = j
  }
  const n = ais.length
  return (rankSum - (n * (n + 1)) / 2) / (n * humans.length)
}

/** The highest threshold any kind needs, with or without a no-AI policy, to stay under its FPR. */
function safeThreshold(examples: Example[], logits: number[]) {
  const thresholds: number[] = []
  for (const kind of KINDS) {
    for (const policy of [false, true]) {
      const pool = examples.flatMap((e, i) =>
        e.source === kind && (e.policy !== undefined) === policy ? [i] : [],
      )
      const humans = pool.filter((i) => examples[i].y === 0).length
      if (humans >= MIN_POOL) {
        thresholds.push(
          thresholdAt(
            pool.map((i) => examples[i]),
            pool.map((i) => logits[i]),
            policy ? POLICY_TARGET_FPR : TARGET_FPR,
          ),
        )
      }
    }
  }
  return Math.max(...thresholds)
}

interface Row {
  name: string
  human: (e: Example) => boolean
  /** Agent texts to report recall on. Without it, AUC is against all of them. */
  ai?: (e: Example) => boolean
}

const ROWS: Row[] = [
  { name: 'all', human: (e) => e.policy !== 'holdout', ai: () => true },
  ...SOURCES.map((source) => ({
    name: source,
    human: (e: Example) => e.source === source && e.policy === undefined,
    ai: (e: Example) => e.source === source,
  })),
  { name: 'policy', human: (e) => e.policy === 'fitted' },
  { name: 'holdout', human: (e) => e.policy === 'holdout' },
]

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`
}

/** AUC, false-positive rate and recall at threshold `t`, per row. */
function report(
  title: string,
  examples: Example[],
  logits: number[],
  t: number,
) {
  const above = (xs: number[]) =>
    pct(xs.filter((x) => x >= t).length / xs.length)
  const logitsWhere = (test: (e: Example) => boolean) =>
    logits.filter((_, i) => test(examples[i]))

  const lines: string[] = []
  for (const row of ROWS) {
    const humans = logitsWhere((e) => e.y === 0 && row.human(e))
    if (humans.length === 0) {
      continue
    }
    const ais = logitsWhere((e) => e.y === 1 && (row.ai?.(e) ?? true))
    const line = `${row.name.padEnd(8)} AUC ${auc(ais, humans).toFixed(3)}  FPR ${above(humans).padStart(6)}`
    if (row.ai) {
      lines.push(`${line}  recall ${above(ais).padStart(6)}`)
      continue
    }
    const byKind = KINDS.map(
      (kind) =>
        `${kind} ${above(logitsWhere((e) => e.y === 0 && row.human(e) && e.source === kind))}`,
    )
    lines.push(`${line}  (${byKind.join(', ')}; ${humans.length} texts)`)
  }
  console.log(`${title}\n  ${lines.join('\n  ')}`)
}

const SIGNALS_PATH = join(ROOT, 'src', 'signals.ts')
const SCORE_PATH = join(ROOT, 'src', 'score.ts')
const BIAS_PATTERN = /(const BIAS = )(-?[\d.]+)/

function currentBias() {
  const match = readFileSync(SCORE_PATH, 'utf-8').match(BIAS_PATTERN)
  if (!match) {
    throw new Error('src/score.ts has no `const BIAS = <number>;`')
  }
  return Number(match[2])
}

function writeWeights(fitted: Signal[], w: number[], bias: number) {
  let signals = readFileSync(SIGNALS_PATH, 'utf-8')
  fitted.forEach((signal, j) => {
    const weight = new RegExp(
      `(id: ['"]${signal.id}['"],\\n[^]*?weight: )-?[\\d.]+`,
    )
    signals = signals.replace(weight, `$1${round(w[j])}`)
  })
  writeFileSync(SIGNALS_PATH, signals)

  const score = readFileSync(SCORE_PATH, 'utf-8')
  writeFileSync(SCORE_PATH, score.replace(BIAS_PATTERN, `$1${round(bias)}`))
}

const { examples, holdout } = load()
const scored = [...examples, ...holdout]

const support = candidates.map(
  (_, j) => examples.filter((e) => e.all[j] > 0).length,
)
const isFitted = (j: number) => support[j] >= MIN_SUPPORT
const fitted = candidates.filter((_, j) => isFitted(j))
const fixed = candidates.filter((_, j) => !isFitted(j))
for (const e of scored) {
  e.x = e.all.filter((_, j) => isFitted(j))
  e.offset = candidates.reduce(
    (z, s, j) => (isFitted(j) ? z : z + s.weight * e.all[j]),
    0,
  )
}

const counts = SOURCES.map((source) => {
  const of = examples.filter((e) => e.source === source)
  return `${source} ${of.filter((e) => e.y === 0).length}/${of.filter((e) => e.y === 1).length}`
})
const groups = new Set(examples.map((e) => e.group)).size
console.log(
  `${examples.length} texts (human/ai): ${counts.join(', ')}; ${groups} repos, agent accounts and policy authors`,
)
console.log(
  `${examples.filter((e) => e.policy).length} of the human texts are under a no-AI policy; ${holdout.length} more held out`,
)
console.log(
  `hand weights kept (< ${MIN_SUPPORT} texts): ${fixed.map((s) => s.id).join(', ')}\n`,
)

const before = currentBias()
const start = fitted.map((s) => s.weight)
const signs = fitted.map((s) => Math.sign(s.weight))
report(
  'current (at 0.5)',
  scored,
  scored.map((e) => logit(start, before, e)),
  0,
)

// The λ with the best out-of-fold recall at the target FPRs.
const best = LAMBDAS.map((lambda) => {
  const logits = outOfFold(examples, lambda, start, signs)
  const t = safeThreshold(examples, logits)
  report(
    `fit λ=${lambda}, out of fold, at ${pct(TARGET_FPR)} FPR (${pct(POLICY_TARGET_FPR)} policy)`,
    examples,
    logits,
    t,
  )
  const recall = logitsOf(examples, logits, 1).filter((l) => l >= t).length
  return { lambda, logits, recall }
}).reduce((a, b) => (b.recall > a.recall ? b : a))

// Fit on all data, then shift the bias so the target FPRs land at 0.5.
const { w, bias: fittedBias } = fitWeights(examples, best.lambda, start, signs)
const bias = fittedBias - safeThreshold(examples, best.logits)
report(
  'chosen (in-sample but for the holdout, at 0.5)',
  scored,
  scored.map((e) => logit(w, bias, e)),
  0,
)
console.log(
  `\nλ=${best.lambda}, bias ${before} -> ${round(bias)} (calibrated to ${pct(TARGET_FPR)} FPR in each source, ${pct(POLICY_TARGET_FPR)} under a no-AI policy)`,
)

const humans = examples.filter((e) => e.y === 0).length
const ais = examples.length - humans
console.table(
  fitted
    .map((s, j) => {
      const fires = examples.filter((e) => e.x[j] > 0)
      return {
        id: s.id,
        before: s.weight,
        after: round(w[j]),
        'fires human': pct(fires.filter((e) => e.y === 0).length / humans),
        'fires ai': pct(fires.filter((e) => e.y === 1).length / ais),
      }
    })
    .sort((a, b) => b.after - a.after),
)

if (process.argv.includes('--write')) {
  writeWeights(fitted, w, bias)
  console.log('wrote weights to src/signals.ts and src/score.ts')
}
