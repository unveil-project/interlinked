import { SIGNALS, type Signal } from './signals'
import { type Template, traceWithoutTemplate } from './template'
import { trace, traceAuthored, traceProse } from './text'

export interface Measurement {
  signal: Signal
  hits: number
  /** Hits over the signal's cap, 0 to 1. */
  strength: number
}

/** The text signals read: what the author wrote, and its prose. */
export function signalText(markdown: string, template?: Template) {
  const authored = traceAuthored(trace(markdown))
  const text = template ? traceWithoutTemplate(authored, template) : authored
  return { text, prose: traceProse(text) }
}

/** Runs signals on a text, before weighting. */
export function measure(
  markdown: string,
  template?: Template,
  signals: Signal[] = SIGNALS,
): Measurement[] {
  const { text, prose } = signalText(markdown ?? '', template)
  return signals.flatMap((signal) => {
    const hits = signal.count(signal.prose ? prose.text : text.text)
    const strength = Math.min(hits, signal.cap) / signal.cap
    return hits > 0 ? [{ signal, hits, strength }] : []
  })
}
