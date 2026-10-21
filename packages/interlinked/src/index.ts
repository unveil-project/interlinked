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
import {
  templateComments,
  trace,
  traceAuthored,
  traceTemplateLines,
} from './text'
import { round } from './utils'

export type { Signal } from './signals'
export type { SignalHit } from './score'
export { SIGNALS }

export { issueFormLines } from './text'

/**
 * Like AgentScan's account classifications, without `mixed`: a text in
 * between gets the side it leans to, with a low `confidence`.
 */
export type TextClassification = 'organic' | 'automation' | 'insufficient-data'

export interface AnalyzeTextResult {
  /** Where the score falls, like AgentScan's account classification. */
  classification: TextClassification
  /**
   * How human the text reads, 0 to 100: 100 is human, 0 is agent. The same
   * scale as AgentScan's account score. `INSUFFICIENT_DATA_SCORE` when there's
   * nothing to score.
   */
  score: number
  /**
   * How sure `classification` is, 0.5 to 1: how far the score sits toward
   * agent for `automation`, toward human for `organic`. Left out for
   * `insufficient-data`, which doesn't lean either way.
   */
  confidence?: number
  signals: SignalHit[]
}

export interface AnalyzeTextOptions {
  /**
   * The repo's PR or issue template, raw markdown. Pass an array for a repo's
   * several issue templates. YAML issue forms are understood too.
   */
  template?: string | string[]
}

/** Scores below this read as automation, and the rest as organic. */
export const AUTOMATION_THRESHOLD = 50

/** The score when there's nothing to score, as in AgentScan. */
export const INSUFFICIENT_DATA_SCORE = -1

/**
 * Guesses whether a text, like a PR description, issue or comment, was written
 * by an AI agent. Every text is read the same way.
 *
 * Pass the repo's PR or issue template if you have it, so its headings and
 * checklists don't count against the author.
 *
 * @example
 * const { classification, confidence } = analyzeText(pr.body ?? "", { template });
 * const { classification } = analyzeText(comment.body);
 */
export function analyzeText(
  markdown: string,
  options: AnalyzeTextOptions = {},
): AnalyzeTextResult {
  const { score, signals } = scoreText(markdown, options.template)

  // Nothing leaned either way but the text's length, so there's nothing to score.
  if (signals.every((signal) => signal.id === 'short-body')) {
    return {
      classification: 'insufficient-data',
      score: INSUFFICIENT_DATA_SCORE,
      signals,
    }
  }

  const classification = classify(score)

  return {
    classification,
    score,
    confidence: confidenceIn(classification, score),
    signals,
  }
}

function confidenceIn(classification: TextClassification, score: number) {
  return round((classification === 'automation' ? 100 - score : score) / 100, 3)
}

function classify(score: number): TextClassification {
  return score < AUTOMATION_THRESHOLD ? 'automation' : 'organic'
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
 * Finds the text copied from the PR or issue template, which `analyzeText`
 * leaves out of the score: its lines, the template cells of its table rows and
 * its HTML comments. Offsets index into `markdown` as given, in order.
 *
 * @example
 * const skipped = locateTemplate(body, template);
 */
export function locateTemplate(
  markdown: string,
  template: string | string[],
): { start: number; end: number }[] {
  return [
    ...traceTemplateLines(traceAuthored(trace(markdown)), template),
    ...templateComments(markdown, template),
  ]
    .sort(([a], [b]) => a - b)
    .map(([start, end]) => ({ start, end }))
}
