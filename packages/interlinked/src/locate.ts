import { SIGNALS, type Signal } from './signals'
import {
  type Range,
  type Traced,
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
      for (const part of untraceParts(markdown, source, range)) {
        locations.push({ signal, range: part })
      }
    }
  }
  return locations.sort((a, b) => a.range[0] - b.range[0])
}

/**
 * A range in a traced text as ranges in `markdown`, split where whole lines
 * were cut out between its characters, like template lines, so they aren't
 * highlighted with it. Parts that are only whitespace are dropped.
 */
function untraceParts(
  markdown: string,
  source: Traced,
  [start, end]: Range,
): Range[] {
  const parts: Range[] = []
  let from = start
  for (let i = start + 1; i <= end; i++) {
    const skipped =
      i < end &&
      markdown
        .slice(source.offsets[i - 1] + 1, source.offsets[i])
        .includes('\n')
    if (i === end || skipped) {
      const part = untrace(source, [from, i])
      if (/\S/.test(markdown.slice(...part))) {
        parts.push(part)
      }
      from = i
    }
  }
  return parts
}
