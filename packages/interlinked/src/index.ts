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
import { templateComments, traceTemplateLines } from './template'
import { trace, traceAuthored } from './text'
import { round } from './utils'

export type { Signal } from './signals'
export type { SignalHit } from './score'
export { SIGNALS }
export { issueFormLines } from './template'

export type TextClassification = 'organic' | 'automation' | 'insufficient-data'

export interface AnalyzeTextResult {
  classification: TextClassification
  /** 0 to 100: 100 is human, 0 is agent. `INSUFFICIENT_DATA_SCORE` when there's nothing to score. */
  score: number
  /** 0.5 to 1. Left out for `insufficient-data`. */
  confidence?: number
  signals: SignalHit[]
}

export interface AnalyzeTextOptions {
  /** The repo's PR template, or its issue templates. YAML issue forms work too. */
  template?: string | string[]
}

export interface SignalLocation {
  id: string
  start: number
  end: number
}

/** Scores below this are automation. */
export const AUTOMATION_THRESHOLD = 50

export const INSUFFICIENT_DATA_SCORE = -1

/**
 * Guesses whether a PR description, issue or comment was written by an AI
 * agent. Pass the repo's template so its text doesn't count.
 *
 * @example
 * const { classification, confidence } = analyzeText(pr.body ?? "", { template });
 */
export function analyzeText(
  markdown: string,
  options: AnalyzeTextOptions = {},
): AnalyzeTextResult {
  const { score, signals } = scoreText(markdown, options.template)

  if (signals.every((signal) => signal.id === 'short-body')) {
    return {
      classification: 'insufficient-data',
      score: INSUFFICIENT_DATA_SCORE,
      signals,
    }
  }

  const automation = score < AUTOMATION_THRESHOLD
  return {
    classification: automation ? 'automation' : 'organic',
    score,
    confidence: round((automation ? 100 - score : score) / 100, 3),
    signals,
  }
}

/**
 * Where each signal matched, as offsets into `markdown`. Pass `ids` to locate
 * only those signals.
 *
 * @example
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

/** Where the text copied from the template is, as offsets into `markdown`. */
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
