/** Start and end offsets, end exclusive. */
export type Range = [start: number, end: number]

/** A text cut down from another, with each character's offset in the original. */
export interface Traced {
  text: string
  offsets: number[]
}

export const HTML_COMMENT = /<!--[\s\S]*?-->/g
const BOT_SUMMARY =
  /<!-- This is an auto-generated comment[\s\S]*?end of auto-generated comment[^>]*-->/g
const CODE_BLOCK = /```[\s\S]*?```/g
const INDENTED_CODE = /^ {4,}(?![-*+] |\d+\. ).*$/gm
const QUOTE = /^ {0,3}>.*$/gm
const CODE_SPAN = /`[^`\n]*`/g

export function trace(text: string): Traced {
  return { text, offsets: Array.from({ length: text.length }, (_, i) => i) }
}

/** A non-empty range in a traced text, as a range in its original. */
export function untrace({ offsets }: Traced, [start, end]: Range): Range {
  return [offsets[start], offsets[end - 1] + 1]
}

/** `String.replace` with a global pattern, keeping track of offsets. */
export function traceReplace(
  source: Traced,
  pattern: RegExp,
  replacement: string,
): Traced {
  let text = ''
  const offsets: number[] = []
  let last = 0
  for (const match of source.text.matchAll(pattern)) {
    text += source.text.slice(last, match.index) + replacement
    offsets.push(
      ...source.offsets.slice(last, match.index),
      ...Array<number>(replacement.length).fill(source.offsets[match.index]),
    )
    last = match.index + match[0].length
  }
  return {
    text: text + source.text.slice(last),
    offsets: [...offsets, ...source.offsets.slice(last)],
  }
}

export function traceTrim({ text, offsets }: Traced): Traced {
  const start = text.search(/\S|$/)
  const end = Math.max(start, text.trimEnd().length)
  return { text: text.slice(start, end), offsets: offsets.slice(start, end) }
}

/** Removes what the author didn't write: HTML comments and bot summaries. */
export function traceAuthored(markdown: Traced) {
  const withoutSummaries = traceReplace(markdown, BOT_SUMMARY, '')
  return traceTrim(traceReplace(withoutSummaries, HTML_COMMENT, ''))
}

export function authoredText(markdown: string) {
  return traceAuthored(trace(markdown)).text
}

function filledLines(text: string) {
  return text.split('\n').filter((line) => /\S/.test(line)).length
}

/** Removes code, and quotes unless they're most of the text. */
export function traceProse(text: Traced) {
  const withoutCode = traceReplace(
    traceReplace(text, CODE_BLOCK, ''),
    INDENTED_CODE,
    '',
  )
  const withoutQuotes = traceReplace(withoutCode, QUOTE, '')
  const mostlyQuotes =
    filledLines(withoutQuotes.text) < filledLines(withoutCode.text) / 2
  return traceReplace(
    mostlyQuotes ? withoutCode : withoutQuotes,
    CODE_SPAN,
    'X',
  )
}

export function prose(text: string) {
  return traceProse(trace(text)).text
}
