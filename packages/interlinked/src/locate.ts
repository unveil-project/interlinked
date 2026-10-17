import { SIGNALS, type Signal } from './signals'
import {
  type Range,
  trace,
  traceAuthored,
  traceProse,
  traceWithoutTemplate,
  untrace,
} from './text'

export interface Location {
  signal: Signal
  range: Range
}

/**
 * Finds where each signal matches in a text, as offsets into `markdown`
 * itself. Reads the same text `measure` does, then maps each match back.
 */
export function locate(
  markdown: string,
  template?: string | string[],
  signals: Signal[] = SIGNALS,
): Location[] {
  const authored = traceAuthored(trace(markdown))
  const text = template ? traceWithoutTemplate(authored, template) : authored
  const proseText = traceProse(text)

  const locations: Location[] = []
  for (const signal of signals) {
    const find =
      signal.locate ?? ('ranges' in signal.count ? signal.count.ranges : null)
    if (!find) {
      continue
    }
    const source = signal.prose ? proseText : text
    for (const range of find(source.text)) {
      if (range[1] > range[0]) {
        locations.push({ signal, range: untrace(source, range) })
      }
    }
  }
  return locations.sort((a, b) => a.range[0] - b.range[0])
}
