import { signalText } from './measure'
import { SIGNALS, type Signal } from './signals'
import type { Template } from './template'
import { type Range, type Traced, untrace } from './text'

export interface Location {
  signal: Signal
  range: Range
}

/** Where each signal matches, as offsets into `markdown`. */
export function locate(
  markdown: string,
  template?: Template,
  signals: Signal[] = SIGNALS,
): Location[] {
  const { text, prose } = signalText(markdown, template)
  const locations: Location[] = []
  for (const signal of signals) {
    if (!('ranges' in signal.count)) {
      continue
    }
    const source = signal.prose ? prose : text
    for (const range of signal.count.ranges(source.text)) {
      for (const part of untraceParts(markdown, source, range)) {
        locations.push({ signal, range: part })
      }
    }
  }
  return locations.sort((a, b) => a.range[0] - b.range[0])
}

function skipsLine(markdown: string, { offsets }: Traced, i: number) {
  return markdown.slice(offsets[i - 1] + 1, offsets[i]).includes('\n')
}

/** A range as ranges in `markdown`, split where lines were cut out of it. */
function untraceParts(
  markdown: string,
  source: Traced,
  [start, end]: Range,
): Range[] {
  const parts: Range[] = []
  let from = start
  for (let i = start + 1; i <= end; i++) {
    if (i === end || skipsLine(markdown, source, i)) {
      const part = untrace(source, [from, i])
      if (/\S/.test(markdown.slice(...part))) {
        parts.push(part)
      }
      from = i
    }
  }
  return parts
}
