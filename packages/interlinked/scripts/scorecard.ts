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

function printScorecard(entries: Record<string, FixtureScore>) {
  const now = summarize(entries)
  const baselinePath = join(FIXTURES_DIR, 'baseline.json')
  const before: Partial<Scorecard> = existsSync(baselinePath)
    ? JSON.parse(readFileSync(baselinePath, 'utf-8')).summary
    : {}
  const { ais, humans } = byLabel(entries)
  const caught = ais.filter(isCorrect).length
  const calledAi = humans.filter((e) => !isCorrect(e)).length
  console.table({
    'score, 0-100 (higher is better)': {
      before: before.score ?? '-',
      now: now.score,
    },
    'AI texts caught (higher is better)': {
      before: percent(before.aiCaught),
      now: `${percent(now.aiCaught)} (${caught} of ${ais.length})`,
    },
    'human texts called AI (lower is better)': {
      before: percent(before.humansCalledAi),
      now: `${percent(now.humansCalledAi)} (${calledAi} of ${humans.length})`,
    },
  })
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
  printScorecard(entries)
  if (process.argv.includes('--misses')) {
    printMisses(entries)
  }
}
