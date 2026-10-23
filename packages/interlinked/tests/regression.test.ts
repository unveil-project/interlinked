import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  FIXTURES_DIR,
  type FixtureScore,
  RATE_TOLERANCE,
  type Scorecard,
  TOLERANCE,
  round,
  scoreFixtures,
  summarize,
} from '../scripts/scorecard'

/**
 * Fails if a fixture moves away from its label, or the scorecard gets worse,
 * compared to `baseline.json`. Update with `pnpm test:regression:update`.
 */

interface Baseline {
  summary: Partial<Scorecard>
  fixtures: Record<string, FixtureScore>
}

const BASELINE_PATH = join(FIXTURES_DIR, 'baseline.json')
const UPDATE = process.env.UPDATE_BASELINE === '1'

/** Signals whose contribution changed, as `id: before -> after`. */
function signalDiff(before: FixtureScore, after: FixtureScore) {
  const ids = new Set([
    ...Object.keys(before.signals),
    ...Object.keys(after.signals),
  ])
  return [...ids]
    .filter((id) => (before.signals[id] ?? 0) !== (after.signals[id] ?? 0))
    .map(
      (id) =>
        `  ${id}: ${before.signals[id] ?? 0} -> ${after.signals[id] ?? 0}`,
    )
    .join('\n')
}

const current = scoreFixtures()

if (UPDATE) {
  const baseline: Baseline = { summary: summarize(current), fixtures: current }
  writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, '\t')}\n`)
}

const baseline: Baseline = existsSync(BASELINE_PATH)
  ? JSON.parse(readFileSync(BASELINE_PATH, 'utf-8'))
  : { summary: {}, fixtures: {} }

describe('regression', () => {
  it('baseline lists exactly the fixtures on disk', () => {
    expect(
      Object.keys(current).sort(),
      'fixtures changed; run `pnpm test:regression:update`',
    ).toEqual(Object.keys(baseline.fixtures).sort())
  })

  describe.each(Object.keys(current))('%s', (name) => {
    const now = current[name]
    const before = baseline.fixtures[name]

    it.runIf(before)('score does not move away from its label', () => {
      if (!before) {
        return
      }
      const delta = round(now.score - before.score)
      // Positive `drift` means moving away from the label.
      const drift = now.label === 'ai' ? delta : -delta

      if (drift < -TOLERANCE) {
        console.info(`improved ${name}: ${before.score} -> ${now.score}`)
      }

      expect(
        drift,
        `${name} (${now.label}) regressed: score ${before.score} -> ${now.score}\n${signalDiff(before, now)}`,
      ).toBeLessThanOrEqual(TOLERANCE)
    })
  })

  it('scorecard does not get worse', () => {
    const now = summarize(current)
    const before = baseline.summary
    console.table({ baseline: before, current: now })
    expect(now.score).toBeGreaterThanOrEqual((before.score ?? 0) - TOLERANCE)
    expect(now.aiCaught).toBeGreaterThanOrEqual(
      (before.aiCaught ?? 0) - RATE_TOLERANCE,
    )
    expect(now.humansCalledAi).toBeLessThanOrEqual(
      (before.humansCalledAi ?? 1) + RATE_TOLERANCE,
    )
  })
})
