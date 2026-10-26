import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AUTOMATION_THRESHOLD } from '../src/index'
import { scoreText } from '../src/score'
import { FIXTURES_DIR, type Label, readFixtures } from './fixtures'

/**
 * `pnpm scorecard`, or `pnpm scorecard --misses` to list misclassified fixtures.
 * Human fixtures predate ChatGPT, so one scored as AI is a real mistake.
 */

export { FIXTURES_DIR }

/** Allows for rounding noise (scores have 1 decimal). */
export const TOLERANCE = 0.1
export const RATE_TOLERANCE = 0.001

export interface FixtureScore {
  label: Label
  /** 0 to 100, 100 is human. */
  score: number
  /** Contribution per signal. */
  signals: Record<string, number>
}

export interface Scorecard {
  /** The average of AI caught and humans not called AI. */
  score: number
  aiCaught: number
  humansCalledAi: number
}

/** Keyed `<label>/<file>`. */
export function scoreFixtures(): Record<string, FixtureScore> {
  return Object.fromEntries(
    readFixtures().map(({ label, name, body, template }) => {
      const { score, signals } = scoreText(body, template)
      const contributions = signals.map((s) => [s.id, s.contribution])
      return [
        `${label}/${name}.md`,
        { label, score, signals: Object.fromEntries(contributions) },
      ]
    }),
  )
}

export function isCorrect({ label, score }: FixtureScore) {
  return (score < AUTOMATION_THRESHOLD ? 'ai' : 'human') === label
}

function byLabel(entries: Record<string, FixtureScore>) {
  const values = Object.values(entries)
  return {
    ais: values.filter((e) => e.label === 'ai'),
    humans: values.filter((e) => e.label === 'human'),
  }
}

function share(count: number, of: number) {
  return of ? count / of : 0
}

export function summarize(entries: Record<string, FixtureScore>): Scorecard {
  const { ais, humans } = byLabel(entries)
  const aiCaught = share(ais.filter(isCorrect).length, ais.length)
  const humansCalledAi = share(
    humans.filter((e) => !isCorrect(e)).length,
    humans.length,
  )
  return {
    score: round((100 * (aiCaught + (1 - humansCalledAi))) / 2, 1),
    aiCaught: round(aiCaught),
    humansCalledAi: round(humansCalledAi),
  }
}

export function round(n: number, digits = 3) {
  const factor = 10 ** digits
  return Math.round(n * factor) / factor
}

function percent(n?: number) {
  return n === undefined ? '-' : `${(100 * n).toFixed(1)}%`
}

/** The last commit's, so updating the baseline doesn't hide the change. */
function readBaselineSummary(): Partial<Scorecard> {
  try {
    const committed = execFileSync('git', ['show', 'HEAD:./baseline.json'], {
      cwd: FIXTURES_DIR,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return JSON.parse(committed).summary
  } catch {
    // Not a git checkout, or the baseline isn't committed yet.
  }
  const baselinePath = join(FIXTURES_DIR, 'baseline.json')
  return existsSync(baselinePath)
    ? JSON.parse(readFileSync(baselinePath, 'utf-8')).summary
    : {}
}

/** What got worse than `before`, empty when nothing did. */
export function worsened(now: Scorecard, before: Partial<Scorecard>) {
  const reasons: string[] = []
  if (before.score !== undefined && now.score < before.score - TOLERANCE) {
    reasons.push(`score ${before.score} -> ${now.score}`)
  }
  if (
    before.aiCaught !== undefined &&
    now.aiCaught < before.aiCaught - RATE_TOLERANCE
  ) {
    reasons.push(
      `AI texts caught ${percent(before.aiCaught)} -> ${percent(now.aiCaught)}`,
    )
  }
  if (
    before.humansCalledAi !== undefined &&
    now.humansCalledAi > before.humansCalledAi + RATE_TOLERANCE
  ) {
    reasons.push(
      `human texts called AI ${percent(before.humansCalledAi)} -> ${percent(now.humansCalledAi)}`,
    )
  }
  return reasons
}

function printScorecard(
  entries: Record<string, FixtureScore>,
  before: Partial<Scorecard>,
) {
  const now = summarize(entries)
  const { ais, humans } = byLabel(entries)
  const caught = ais.filter(isCorrect).length
  const calledAi = humans.filter((e) => !isCorrect(e)).length
  const rows = [
    ['', 'before', 'now', 'change', ''],
    [
      'AI caught',
      ...compare(before.aiCaught, now.aiCaught),
      `${caught} of ${ais.length}`,
    ],
    [
      'humans flagged',
      ...compare(before.humansCalledAi, now.humansCalledAi),
      `${calledAi} of ${humans.length}`,
    ],
    [
      'overall',
      ...compare(
        before.score === undefined ? undefined : before.score / 100,
        now.score / 100,
      ),
      '',
    ],
  ]
  const widths = rows[0].map((_, i) =>
    Math.max(...rows.map((row) => row[i].length)),
  )
  for (const row of rows) {
    const [label, ...cells] = row
    const padded = cells.map((cell, i) =>
      i === cells.length - 1 ? cell : cell.padStart(widths[i + 1]),
    )
    console.log(`${label.padEnd(widths[0])}  ${padded.join('  ')}`.trimEnd())
  }
}

/** Before, now, and the change in points. */
function compare(before: number | undefined, now: number) {
  if (before === undefined) {
    return ['-', percent(now), '']
  }
  const points = round(100 * (now - before), 1)
  let change = '·'
  if (points !== 0) {
    change = points > 0 ? `+${points}` : `${points}`
  }
  return [percent(before), percent(now), change]
}

function printMisses(entries: Record<string, FixtureScore>) {
  const misses = Object.entries(entries)
    .filter(([, e]) => !isCorrect(e))
    .sort(([, a], [, b]) => a.score - b.score)
  for (const [name, e] of misses) {
    const signals = Object.entries(e.signals)
      .map(([id, contribution]) => `${id} ${contribution}`)
      .join(', ')
    console.log(`${e.score.toFixed(1).padStart(5)}  ${name}\n       ${signals}`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const entries = scoreFixtures()
  const before = readBaselineSummary()
  printScorecard(entries, before)
  if (process.argv.includes('--misses')) {
    printMisses(entries)
  }
  const reasons = worsened(summarize(entries), before)
  if (reasons.length > 0) {
    console.error(
      `\nScorecard is worse than baseline:\n  ${reasons.join('\n  ')}`,
    )
    process.exitCode = 1
  }
}
