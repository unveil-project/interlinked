import {
  type Range,
  prose,
  trace,
  traceProse,
  traceReplace,
  untrace,
} from './text'

export type { Range }

/** Minimum length for densities, so one code span in a short text isn't dense. */
const MIN_DENSITY_LENGTH = 300

/** Counts something in a text, and can say where each counted thing is. */
export interface Counter {
  (text: string): number
  ranges: (text: string) => Range[]
}

function counter(
  count: (text: string) => number,
  ranges: (text: string) => Range[],
): Counter {
  return Object.assign(count, { ranges })
}

export function matches(pattern: RegExp) {
  const flags = pattern.flags.includes('g')
    ? pattern.flags
    : `${pattern.flags}g`
  const globalPattern = new RegExp(pattern.source, flags)
  return counter(
    (text) => text.match(globalPattern)?.length ?? 0,
    (text) =>
      Array.from(text.matchAll(globalPattern), (match): Range => [
        match.index,
        match.index + match[0].length,
      ]),
  )
}

const CHECKLIST_ITEM = /^\s*[-*] \[[ xX]\].*$/gm

/** Like `matches`, but skips checklist items (template wording, not the author's). */
export function matchesOutsideChecklists(pattern: RegExp) {
  const count = matches(pattern)
  return counter(
    (text) => count(text.replace(CHECKLIST_ITEM, '')),
    (text) => {
      const traced = traceReplace(trace(text), CHECKLIST_ITEM, '')
      return count.ranges(traced.text).map((range) => untrace(traced, range))
    },
  )
}

function isStatement(line: string) {
  return (
    !/^\s*[-*] \[[ xX]\]/.test(line) &&
    !/\?\s*(?:\*\*)?\s*$/.test(line) &&
    !/:\s*(?:\*\*)?\s*(?:no|none|n\/a)\b/i.test(line)
  )
}

/** Like `matchesOutsideChecklists`, but also skips questions and "no" answers. */
export function matchesInStatements(pattern: RegExp) {
  const count = matches(pattern)
  return counter(
    (text) =>
      text
        .split('\n')
        .filter(isStatement)
        .reduce((sum, line) => sum + count(line), 0),
    (text) => {
      const ranges: Range[] = []
      let offset = 0
      for (const line of text.split('\n')) {
        if (isStatement(line)) {
          for (const [start, end] of count.ranges(line)) {
            ranges.push([offset + start, offset + end])
          }
        }
        offset += line.length + 1
      }
      return ranges
    },
  )
}

/** Matches per 1,000 characters. */
export function density(pattern: RegExp, count: Counter = matches(pattern)) {
  return counter((text) => {
    if (text.length === 0) {
      return 0
    }
    return (count(text) / Math.max(text.length, MIN_DENSITY_LENGTH)) * 1000
  }, count.ranges)
}

/** Like `density`, but skips checklist items. */
export function densityOutsideChecklists(pattern: RegExp) {
  return density(pattern, matchesOutsideChecklists(pattern))
}

/** Counts only past `floor`, for habits people have too, just less often. */
export function beyond(count: Counter, floor: number) {
  return counter((text) => Math.max(0, count(text) - floor), count.ranges)
}

/** Counts nothing until there are at least `min` matches, so a lone one never counts. */
export function atLeast(count: Counter, min: number) {
  return counter((text) => {
    if (count.ranges(text).length < min) {
      return 0
    }
    return count(text)
  }, count.ranges)
}

/** The trimmed prose lines of a text. */
function proseLines(text: string) {
  return prose(text)
    .split('\n')
    .map((line) => line.trim())
}

/** Each trimmed line of a text, with where it starts and ends. */
function lineSpans(text: string) {
  let offset = 0
  return text.split('\n').map((line) => {
    const start = offset + line.search(/\S|$/)
    const trimmed = line.trim()
    offset += line.length + 1
    return { line: trimmed, range: [start, start + trimmed.length] as Range }
  })
}

/** The prose lines of a text that pass `test`, as ranges in the text. */
function proseLineRanges(text: string, test: (line: string) => boolean) {
  const traced = traceProse(trace(text))
  return lineSpans(traced.text)
    .filter(({ line }) => test(line))
    .map(({ range }) => untrace(traced, range))
}

function isSentence(line: string) {
  return line.split(/\s+/).length >= 5 && !/^[-*#|>\d]/.test(line)
}

function isUnpunctuated(line: string) {
  return isSentence(line) && !/[.!?:)`]$/.test(line)
}

/** Prose lines of 5 or more words with no final punctuation. */
export const unpunctuatedLines = counter(
  (text) => proseLines(text).filter(isUnpunctuated).length,
  (text) => proseLineRanges(text, isUnpunctuated),
)

function isTidy(line: string) {
  return /^[A-Z`X]/.test(line) && /[.:)]$/.test(line)
}

const TIDY_FLOOR = 2

/** Sentence lines past the first two, when all are capitalized and punctuated. */
export const tidyLines = counter(
  (text) => {
    const lines = proseLines(text).filter(isSentence)
    return lines.every(isTidy) ? Math.max(0, lines.length - TIDY_FLOOR) : 0
  },
  (text) => {
    const ranges = proseLineRanges(text, isSentence)
    const lines = proseLines(text).filter(isSentence)
    return lines.every(isTidy) && lines.length > TIDY_FLOOR ? ranges : []
  },
)

function isLongParagraph(line: string) {
  return !/^(?:[-*#|>]|\d+\.)/.test(line) && line.split(/\s+/).length >= 50
}

/** Prose paragraphs of 50 or more words. */
export const longParagraphs = counter(
  (text) => proseLines(text).filter(isLongParagraph).length,
  (text) => proseLineRanges(text, isLongParagraph),
)
