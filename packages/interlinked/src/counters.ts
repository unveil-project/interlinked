import { type Range, trace, traceProse, traceReplace, untrace } from './text'

/** Counts something in a text, and says where each counted thing is. */
export interface Counter {
  (text: string): number
  ranges: (text: string) => Range[]
}

/** So one code span in a short text isn't dense. */
const MIN_DENSITY_LENGTH = 300
/** About a short PR description. */
const LENGTH_UNIT = 1000
const TIDY_FLOOR = 2
const CHECKLIST_ITEM = /^\s*[-*] \[[ xX]\].*$/gm

function counter(
  ranges: (text: string) => Range[],
  count = (text: string) => ranges(text).length,
): Counter {
  return Object.assign(count, { ranges })
}

export function matches(pattern: RegExp) {
  const flags = pattern.flags.includes('g')
    ? pattern.flags
    : `${pattern.flags}g`
  const global = new RegExp(pattern.source, flags)
  return counter((text) =>
    Array.from(text.matchAll(global), (match): Range => [
      match.index,
      match.index + match[0].length,
    ]),
  )
}

/** Skips checklist items, which are template wording. */
export function matchesOutsideChecklists(pattern: RegExp) {
  const inner = matches(pattern)
  return counter((text) => {
    const traced = traceReplace(trace(text), CHECKLIST_ITEM, '')
    return inner.ranges(traced.text).map((range) => untrace(traced, range))
  })
}

function isStatement(line: string) {
  return (
    !/^\s*[-*] \[[ xX]\]/.test(line) &&
    !/\?\s*(?:\*\*)?\s*$/.test(line) &&
    !/:\s*(?:\*\*)?\s*(?:no|none|n\/a)\b/i.test(line)
  )
}

/** Skips checklist items, questions and "no" answers. */
export function matchesInStatements(pattern: RegExp) {
  const inner = matches(pattern)
  return counter((text) => {
    const ranges: Range[] = []
    let offset = 0
    for (const line of text.split('\n')) {
      if (isStatement(line)) {
        for (const [start, end] of inner.ranges(line)) {
          ranges.push([offset + start, offset + end])
        }
      }
      offset += line.length + 1
    }
    return ranges
  })
}

export function either(...counters: Counter[]) {
  return counter((text) => counters.flatMap((count) => count.ranges(text)))
}

/** Per 1,000 characters. */
export function density(count: Counter) {
  return counter(
    count.ranges,
    (text) => (count(text) / Math.max(text.length, MIN_DENSITY_LENGTH)) * 1000,
  )
}

/** Divided by the square root of the length, for habits long texts have more of. */
export function perLength(count: Counter) {
  return counter(
    count.ranges,
    (text) => count(text) / Math.sqrt(Math.max(1, text.length / LENGTH_UNIT)),
  )
}

/** Counts only past `floor`, for habits people have too, just less often. */
export function beyond(count: Counter, floor: number) {
  return counter(count.ranges, (text) => Math.max(0, count(text) - floor))
}

/** Counts nothing below `min` matches. */
export function atLeast(count: Counter, min: number) {
  return counter(count.ranges, (text) =>
    count.ranges(text).length < min ? 0 : count(text),
  )
}

/** Where the trimmed prose lines that pass `test` are. */
function proseLineRanges(text: string, test: (line: string) => boolean) {
  const traced = traceProse(trace(text))
  const ranges: Range[] = []
  let offset = 0
  for (const raw of traced.text.split('\n')) {
    const line = raw.trim()
    const start = offset + raw.search(/\S|$/)
    if (test(line)) {
      ranges.push(untrace(traced, [start, start + line.length]))
    }
    offset += raw.length + 1
  }
  return ranges
}

function lines(test: (line: string) => boolean) {
  return counter((text) => proseLineRanges(text, test))
}

function isSentence(line: string) {
  return line.split(/\s+/).length >= 5 && !/^[-*#|>\d]/.test(line)
}

function isTidy(line: string) {
  return /^[A-Z`X]/.test(line) && /[.:)]$/.test(line)
}

/** Sentences of 5 or more words with no final punctuation. */
export const unpunctuatedLines = lines(
  (line) => isSentence(line) && !/[.!?:)`]$/.test(line),
)

/** Paragraphs of 50 or more words. */
export const longParagraphs = lines(
  (line) => !/^(?:[-*#|>]|\d+\.)/.test(line) && line.split(/\s+/).length >= 50,
)

/** Sentences past the first two, when all are capitalized and punctuated. */
export const tidyLines = beyond(
  counter((text) => {
    const sentences = proseLineRanges(text, isSentence)
    const untidy = proseLineRanges(
      text,
      (line) => isSentence(line) && !isTidy(line),
    )
    return untidy.length === 0 && sentences.length > TIDY_FLOOR ? sentences : []
  }),
  TIDY_FLOOR,
)
