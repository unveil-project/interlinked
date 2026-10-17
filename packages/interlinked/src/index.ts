/**
 * When you're not performing your duties do they keep you in a little box?
 * Cells.
 * Interlinked.
 * What's it like to hold the hand of someone you love?
 * Interlinked.
 * Did you buy a present for the person you love?
 * Within cells interlinked.
 * Why don't you say that three times?
 * Within cells interlinked.
 * Within cells interlinked.
 * Within cells interlinked.
 */
import { locate } from './locate'
import { measure } from './measure'
import { SIGNALS } from './signals'
import { round, sigmoid } from './utils'

export type { Signal } from './signals'
export { SIGNALS }

export { issueFormLines } from './text'

export interface SignalHit {
  id: string
  description: string
  hits: number
  contribution: number
}

export interface AnalyzeTextResult {
  verdict: 'ai' | 'human'
  /** Probability the text is agent-written, 0 to 1. */
  probability: number
  /** Confidence in `verdict`, 0.5 to 1. */
  confidence: number
  signals: SignalHit[]
}

export interface AnalyzeTextOptions {
  /**
   * The repo's PR or issue template, raw markdown. Pass an array for a repo's
   * several issue templates. YAML issue forms are understood too.
   */
  template?: string | string[]
}

/**
 * Starting log-odds. Set so at most about 3% of pre-agent PRs, issues or
 * comments score as AI, because a false accusation is worse than a miss.
 */
const BIAS = -1.38

export const AI_THRESHOLD = 0.5

/**
 * Guesses whether a text, like a PR description, issue or comment, was written
 * by an AI agent. Every text is read the same way.
 *
 * Pass the repo's PR or issue template if you have it, so its headings and
 * checklists don't count against the author.
 *
 * @example
 * const { verdict, confidence } = analyzeText(pr.body ?? "", { template });
 * const { verdict } = analyzeText(comment.body);
 */
export function analyzeText(
  markdown: string,
  options: AnalyzeTextOptions = {},
): AnalyzeTextResult {
  let logit = BIAS
  const signals: SignalHit[] = []

  const active = SIGNALS.filter((signal) => signal.weight !== 0)
  for (const { signal, hits, strength } of measure(
    markdown,
    options.template,
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

  const probability = sigmoid(logit)
  const verdict = probability >= AI_THRESHOLD ? 'ai' : 'human'

  return {
    verdict,
    probability: round(probability, 3),
    confidence: round(verdict === 'ai' ? probability : 1 - probability, 3),
    signals,
  }
}

export interface SignalLocation {
  /** The signal's `id`, as in `SignalHit`. */
  id: string
  /** Offset of the first matched character in the markdown. */
  start: number
  /** Offset just past the last matched character. */
  end: number
}

/**
 * Finds where in the text each signal matched, to highlight it. Offsets index
 * into `markdown` as given. Signals that weigh the whole text, like its length,
 * have no locations.
 *
 * Pass the ids from `analyzeText`'s result to locate only the signals that
 * counted toward the score.
 *
 * @example
 * const result = analyzeText(body, { template });
 * const locations = locateSignals(body, { template }, result.signals.map((s) => s.id));
 */
export function locateSignals(
  markdown: string,
  options: AnalyzeTextOptions = {},
  ids?: string[],
): SignalLocation[] {
  const signals = SIGNALS.filter(
    (signal) => signal.weight !== 0 && (!ids || ids.includes(signal.id)),
  )
  return locate(markdown, options.template, signals).map(
    ({ signal, range: [start, end] }) => ({ id: signal.id, start, end }),
  )
}
