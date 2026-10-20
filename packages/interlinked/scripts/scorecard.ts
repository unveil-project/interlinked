import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AUTOMATION_THRESHOLD } from '../src/index'
import { scoreText } from '../src/score'

/**
 * Sums up all fixture scores in one scorecard, to compare changes.
 * `pnpm scorecard`, or `pnpm scorecard --misses` to list misclassified fixtures.
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
  /** 0 to 100: mean of recall, 1 - false-positive rate and AUC. */
  overall: number
  fixtures: number
  correct: number
  accuracy: number
  /** Share of ai fixtures scored as ai. */
  recall: number
  /** Share of human fixtures scored as ai. */
  falsePositiveRate: number
  /** Chance a random ai fixture scores lower than a random human one. */
  auc: number
  /** Mean log-loss against the labels. */
  logLoss: number
  meanAiScore: number
  meanHumanScore: number
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
  const ais = values.filter((e) => e.label === 'ai')
  const humans = values.filter((e) => e.label === 'human')
  const share = (of: FixtureScore[], test: (e: FixtureScore) => boolean) =>
    of.length ? of.filter(test).length / of.length : 0
  const mean = (of: FixtureScore[]) =>
    of.length ? of.reduce((sum, e) => sum + e.score, 0) / of.length : 0

  const recall = share(ais, isCorrect)
  const falsePositiveRate = share(humans, (e) => !isCorrect(e))

  let wins = 0
  for (const a of ais) {
    for (const h of humans) {
      wins += a.score < h.score ? 1 : a.score === h.score ? 0.5 : 0
    }
  }
  const auc =
    ais.length && humans.length ? wins / (ais.length * humans.length) : 0

  const logLoss =
    values.reduce((sum, e) => {
      const p = Math.min(Math.max(1 - e.score / 100, 1e-6), 1 - 1e-6)
      return sum - Math.log(e.label === 'ai' ? p : 1 - p)
    }, 0) / Math.max(values.length, 1)

  const correct = values.filter(isCorrect).length
  return {
    overall: round((100 * (recall + (1 - falsePositiveRate) + auc)) / 3, 2),
    fixtures: values.length,
    correct,
    accuracy: round(values.length ? correct / values.length : 0),
    recall: round(recall),
    falsePositiveRate: round(falsePositiveRate),
    auc: round(auc),
    logLoss: round(logLoss),
    meanAiScore: round(mean(ais), 1),
    meanHumanScore: round(mean(humans), 1),
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
  console.table(
    Object.fromEntries(
      Object.entries(now).map(([key, value]) => [
        key,
        { baseline: baseline[key as keyof Scorecard], current: value },
      ]),
    ),
  )

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
