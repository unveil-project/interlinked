import { measure } from './measure'
import { SIGNALS } from './signals'
import type { Template } from './template'
import { round, sigmoid } from './utils'

export interface SignalHit {
  id: string
  description: string
  hits: number
  contribution: number
}

/** Set by `scripts/fit-weights.ts`, so few human texts score as AI. */
const BIAS = -2.11

/** The score, 0 to 100 with 100 human, and the signals behind it. */
export function scoreText(markdown: string, template?: Template) {
  const active = SIGNALS.filter((signal) => signal.weight !== 0)
  const measurements = measure(markdown, template, active)
  const logit = measurements.reduce(
    (sum, { signal, strength }) => sum + signal.weight * strength,
    BIAS,
  )
  const signals: SignalHit[] = measurements
    .map(({ signal, hits, strength }) => ({
      id: signal.id,
      description: signal.description,
      hits: round(hits),
      contribution: round(signal.weight * strength),
    }))
    .sort((a, b) => b.contribution - a.contribution)

  return { score: round(100 * (1 - sigmoid(logit)), 1), signals }
}
