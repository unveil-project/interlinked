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
import { type SignalHit, scoreText } from './score'
import { SIGNALS } from './signals'
import { trace, traceAuthored, traceTemplateLines } from './text'
import { round } from './utils'

export type { Signal } from './signals'
export type { SignalHit } from './score'
export { SIGNALS }

export { issueFormLines } from './text'

/** The same classifications as agentscan's accounts. */
export type TextClassification =
  'organic' | 'mixed' | 'automation' | 'insufficient-data'

export interface AnalyzeTextResult {
  /** `human` when there's insufficient data, since there's nothing to flag. */
  verdict: 'ai' | 'human'
  /** Where the score falls, like agentscan's account classification. */
  classification: TextClassification
  /**
   * How human the text reads, 0 to 100: 100 is human, 0 is agent. The same
   * scale as agentscan's account score. `INSUFFICIENT_DATA_SCORE` when there's
   * nothing to score.
   */
  score: number
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

/** Scores below this read as automation, and give the verdict `ai`. */
export const AUTOMATION_THRESHOLD = 50

/** Scores at or above this read as organic. Between the two is mixed. */
export const ORGANIC_THRESHOLD = 70

/** The score when there's nothing to score, as in agentscan. */
export const INSUFFICIENT_DATA_SCORE = -1

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
  const { score, signals } = scoreText(markdown, options.template)

  // Nothing leaned either way but the text's length, so there's nothing to score.
  if (signals.every((signal) => signal.id === 'short-body')) {
    return {
      verdict: 'human',
      classification: 'insufficient-data',
      score: INSUFFICIENT_DATA_SCORE,
      confidence: 0.5,
      signals,
    }
  }

  const verdict = score < AUTOMATION_THRESHOLD ? 'ai' : 'human'

  return {
    verdict,
    classification: classify(score),
    score,
    confidence: round((verdict === 'ai' ? 100 - score : score) / 100, 3),
    signals,
  }
}

function classify(score: number): TextClassification {
  if (score < AUTOMATION_THRESHOLD) {
    return 'automation'
  }
  if (score < ORGANIC_THRESHOLD) {
    return 'mixed'
  }
  return 'organic'
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

/**
 * Finds the lines copied from the PR or issue template, which `analyzeText`
 * leaves out of the score. Offsets index into `markdown` as given.
 *
 * @example
 * const skipped = locateTemplate(body, template);
 */
export function locateTemplate(
  markdown: string,
  template: string | string[],
): { start: number; end: number }[] {
  return traceTemplateLines(traceAuthored(trace(markdown)), template).map(
    ([start, end]) => ({ start, end }),
  )
}
