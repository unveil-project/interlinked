import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AUTOMATION_THRESHOLD } from '../src/index'
import { scoreText } from '../src/score'

/**
 * Sums up all fixture scores in one scorecard, to compare changes.
 * `pnpm scorecard`, or `pnpm scorecard --misses` to list misclassified fixtures.
 *
 * We trust a human fixture is human because it was written before ChatGPT
 * (November 2022), when AI couldn't have written it. So a human fixture scored
 * as AI is a real mistake.
 */

export type Label = 'ai' | 'human'

export interface FixtureScore {
  label: Label
  /** 0 to 100, 100 is human. */
  score: number
  /** Contribution per signal. */
  signals: Record<string, number>
}

export interface Scorecard {
  /** 0 to 100, higher is better: the average of AI caught and humans not called AI. */
  score: number
  /** Share of AI fixtures called AI. Higher is better. */
  aiCaught: number
  /** Share of human fixtures called AI. Lower is better. */
  humansCalledAi: number
}

const LABELS: Label[] = ['ai', 'human']
export const FIXTURES_DIR = join(import.meta.dirname, '..', 'tests', 'fixtures')

/** Scores each fixture, keyed `<label>/<file>`, with its `.template.md` if any. */
export function scoreFixtures(): Record<string, FixtureScore> {
  const entries: Record<string, FixtureScore> = {}
  for (const label of LABELS) {
    const dir = join(FIXTURES_DIR, label)
    if (!existsSync(dir)) {
      continue
    }
    const files = readdirSync(dir).filter(
      (f) => f.endsWith('.md') && !f.endsWith('.template.md'),
    )
    for (const file of files.sort()) {
      const templatePath = join(dir, file.replace(/\.md$/, '.template.md'))
      const result = scoreText(
        readFileSync(join(dir, file), 'utf-8'),
        existsSync(templatePath)
          ? readFileSync(templatePath, 'utf-8')
          : undefined,
      )
      entries[`${label}/${file}`] = {
        label,
        score: result.score,
        signals: Object.fromEntries(
          result.signals.map((s) => [s.id, s.contribution]),
        ),
      }
    }
  }
  return entries
}

export function isCorrect({ label, score }: FixtureScore) {
  return (score < AUTOMATION_THRESHOLD ? 'ai' : 'human') === label
}

export function summarize(entries: Record<string, FixtureScore>): Scorecard {
  const values = Object.values(entries)
  const share = (label: Label, called: Label) => {
    const of = values.filter((e) => e.label === label)
    const hits = of.filter((e) => isCorrect(e) === (label === called)).length
    return of.length ? hits / of.length : 0
  }
  const aiCaught = share('ai', 'ai')
  const humansCalledAi = share('human', 'ai')
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const entries = scoreFixtures()
  const now = summarize(entries)
  const baselinePath = join(FIXTURES_DIR, 'baseline.json')
  const baseline: Partial<Scorecard> = existsSync(baselinePath)
    ? JSON.parse(readFileSync(baselinePath, 'utf-8')).summary
    : {}
  const values = Object.values(entries)
  const count = (label: Label) => values.filter((e) => e.label === label)
  const ais = count('ai')
  const humans = count('human')
  const percent = (n?: number) =>
    n === undefined ? '-' : `${(100 * n).toFixed(1)}%`
  console.table({
    'score, 0-100 (higher is better)': {
      before: baseline.score ?? '-',
      now: now.score,
    },
    'AI texts caught (higher is better)': {
      before: percent(baseline.aiCaught),
      now: `${percent(now.aiCaught)} (${ais.filter(isCorrect).length} of ${ais.length})`,
    },
    'human texts called AI (lower is better)': {
      before: percent(baseline.humansCalledAi),
      now: `${percent(now.humansCalledAi)} (${humans.filter((e) => !isCorrect(e)).length} of ${humans.length})`,
    },
  })

  if (process.argv.includes('--misses')) {
    const misses = Object.entries(entries)
      .filter(([, e]) => !isCorrect(e))
      .sort(([, a], [, b]) => a.score - b.score)
    for (const [name, e] of misses) {
      const top = Object.entries(e.signals)
        .map(([id, c]) => `${id} ${c}`)
        .join(', ')
      console.log(`${e.score.toFixed(1).padStart(5)}  ${name}\n       ${top}`)
    }
  }
}
