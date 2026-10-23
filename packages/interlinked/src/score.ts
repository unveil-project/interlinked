import { measure } from './measure'
import { SIGNALS } from './signals'
import { round, sigmoid } from './utils'

export interface SignalHit {
  id: string
  description: string
  hits: number
  contribution: number
}

/**
 * Starting log-odds. Set so at most about 3% of pre-agent PRs, issues or
 * comments score as AI, and 2% of today's from projects that ban LLM-written
 * contributions, because a false accusation is worse than a miss.
 */
const BIAS = -2.11

/**
 * The model's score, 0 to 100 with 100 human, and the signals behind it.
 * `analyzeText` builds its result on this. The regression tests measure it
 * directly, so a text with too little to score still has a number to compare.
 */
export function scoreText(
  markdown: string,
  template?: string | string[],
): { score: number; signals: SignalHit[] } {
  let logit = BIAS
  const signals: SignalHit[] = []

  const active = SIGNALS.filter((signal) => signal.weight !== 0)
  for (const { signal, hits, strength } of measure(
    markdown,
    template,
    active,
  )) {
    const contribution = signal.weight * strength
    logit += contribution
    signals.push({
      id: signal.id,
      description: signal.description,
      hits: round(hits),
      contribution: round(contribution),
    })
  }

  signals.sort((a, b) => b.contribution - a.contribution)

  return { score: round(100 * (1 - sigmoid(logit)), 1), signals }
}
