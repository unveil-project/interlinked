/** Where a match is in a text: start and end offsets, end exclusive. */
export type Range = [start: number, end: number]

/**
 * A text cut down from another, and for each of its characters, that
 * character's offset in the original. Lets a match in the cut-down text be
 * shown in the original.
 */
export interface Traced {
  text: string
  offsets: number[]
}

export function trace(text: string): Traced {
  return { text, offsets: Array.from({ length: text.length }, (_, i) => i) }
}

/** A non-empty range in a traced text, as a range in its original. */
export function untrace({ offsets }: Traced, [start, end]: Range): Range {
  return [offsets[start], offsets[end - 1] + 1]
}

/** `String.replace` with a global pattern, keeping track of offsets. */
export function traceReplace(
  { text, offsets }: Traced,
  pattern: RegExp,
  replacement: string,
): Traced {
  let result = ''
  const resultOffsets: number[] = []
  let last = 0
  for (const match of text.matchAll(pattern)) {
    result += text.slice(last, match.index) + replacement
    resultOffsets.push(
      ...offsets.slice(last, match.index),
      ...Array<number>(replacement.length).fill(offsets[match.index]),
    )
    last = match.index + match[0].length
  }
  return {
    text: result + text.slice(last),
    offsets: [...resultOffsets, ...offsets.slice(last)],
  }
}

function trim({ text, offsets }: Traced): Traced {
  const start = text.search(/\S|$/)
  const end = text.trimEnd().length
  return {
    text: text.slice(start, Math.max(start, end)),
    offsets: offsets.slice(start, Math.max(start, end)),
  }
}

/** Removes text the author didn't write: HTML comments and bot summaries. */
export function traceAuthored(markdown: Traced) {
  return trim(
    traceReplace(
      traceReplace(
        markdown,
        /<!-- This is an auto-generated comment[\s\S]*?end of auto-generated comment[^>]*-->/g,
        '',
      ),
      /<!--[\s\S]*?-->/g,
      '',
    ),
  )
}

/** Removes text the author didn't write: HTML comments and bot summaries. */
export function authoredText(markdown: string) {
  return traceAuthored(trace(markdown)).text
}

/** Normalizes a line for template matching, ignoring ticks, strike-through and list markers. */
function templateKey(line: string) {
  return line
    .replace(/~~/g, '')
    .replace(/^\s*[-*+]\s+(?=\[[ xX]\])/, '')
    .replace(/\[[ xX]\]/g, '[ ]')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function unquote(value: string) {
  return value.replace(/^(["'])(.*)\1$/, '$2')
}

/**
 * The lines a YAML issue form leaves in an issue: `### label` headings,
 * checkbox and dropdown options, default values and `_No response_`.
 */
export function issueFormLines(yaml: string) {
  const lines = ['_No response_']
  const rows = yaml.split('\n')
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const field = row.match(/^(\s*)(-\s+)?(label|value):\s*(.*)$/)
    if (field) {
      const [, indent, option, key, value] = field
      if (/^[|>][-+]?$/.test(value.trim())) {
        // A block scalar: every deeper-indented line that follows.
        while (
          i + 1 < rows.length &&
          (rows[i + 1].trim() === '' ||
            rows[i + 1].search(/\S/) > indent.length)
        ) {
          lines.push(rows[++i].trim())
        }
      } else if (key === 'label') {
        lines.push(
          option
            ? `- [ ] ${unquote(value.trim())}`
            : `### ${unquote(value.trim())}`,
        )
      } else {
        lines.push(unquote(value.trim()))
      }
      continue
    }
    const dropdownOption = row.match(/^\s*-\s+(?![\w-]+:(?:\s|$))(.+)$/)
    if (dropdownOption) {
      lines.push(unquote(dropdownOption[1].trim()))
    }
  }
  return lines
}

function isIssueForm(template: string) {
  return /^body:\s*$/m.test(template) && /^\s*-\s+type:/m.test(template)
}

/** A table row's cells, as ranges in the line, or `undefined` for other lines. */
function tableCells(line: string): Range[] | undefined {
  if (!/^\s*\|/.test(line)) {
    return undefined
  }
  const borders = [...line.matchAll(/(?<!\\)\|/g)].map((match) => match.index)
  return borders.map((border, i) => [
    border + 1,
    i + 1 < borders.length ? borders[i + 1] : line.length,
  ])
}

interface TemplateKeys {
  lines: Set<string>
  /** Per table row's first cell, the `column:cell` keys of the row's cells. */
  rows: Map<string, Set<string>>
}

/** The template lines, as keys to look a text's lines up by. */
function templateKeys(template: string | string[]): TemplateKeys {
  const templates = Array.isArray(template) ? template : [template]
  const lines = templates.flatMap((t) =>
    isIssueForm(t) ? issueFormLines(t) : authoredText(t).split('\n'),
  )
  const rows = new Map<string, Set<string>>()
  for (const line of lines) {
    const cells = tableCells(line)?.map(([s, e]) =>
      templateKey(line.slice(s, e)),
    )
    if (!cells || cells[0].length <= 2) {
      continue
    }
    const row = rows.get(cells[0]) ?? new Set()
    cells.forEach((cell, i) => row.add(`${i}:${cell}`))
    rows.set(cells[0], row)
  }
  return {
    lines: new Set(lines.map(templateKey).filter((line) => line.length > 2)),
    rows,
  }
}

/**
 * The parts of a line the author wrote, as ranges in it: none for a template
 * line, the whole line for others. A table row starting like a template row
 * keeps only the cells that differ from it, so `| Fixed Issues? | Fixes #1`
 * keeps `Fixes #1` against the template's `| Fixed Issues? |`.
 */
function authoredParts(keys: TemplateKeys, line: string): Range[] {
  if (keys.lines.has(templateKey(line))) {
    return []
  }
  const cells = tableCells(line)
  const row = cells && keys.rows.get(templateKey(line.slice(...cells[0])))
  if (!row) {
    return [[0, line.length]]
  }
  return cells
    .filter(([s, e], i) => {
      const cell = templateKey(line.slice(s, e))
      return cell !== '' && !/^:?-+:?$/.test(cell) && !row.has(`${i}:${cell}`)
    })
    .map(([s, e]) => {
      const cell = line.slice(s, e)
      return [s + cell.search(/\S/), s + cell.trimEnd().length]
    })
}

/** Removes lines copied from the PR or issue templates, ticked checklist items included. */
export function traceWithoutTemplate(
  { text, offsets }: Traced,
  template: string | string[],
) {
  const keys = templateKeys(template)
  const lines: Traced[] = []
  let start = 0
  for (const line of text.split('\n')) {
    const parts = authoredParts(keys, line)
    if (parts.length > 0) {
      // Parts are joined by a space, and each kept line takes its line break
      // along, the last one excepted.
      lines.push({
        text: parts.map(([s, e]) => line.slice(s, e)).join(' '),
        offsets: [
          ...parts.flatMap(([s, e], i) => [
            ...(i > 0 ? [offsets[start + s]] : []),
            ...offsets.slice(start + s, start + e),
          ]),
          ...offsets.slice(start + line.length, start + line.length + 1),
        ],
      })
    }
    start += line.length + 1
  }
  return trim({
    text: lines.map((line) => line.text).join('\n'),
    offsets: lines.flatMap((line, i) =>
      i < lines.length - 1
        ? line.offsets
        : line.offsets.slice(0, line.text.length),
    ),
  })
}

/** Where the lines copied from the PR or issue templates are, in the original text. */
export function traceTemplateLines(
  markdown: Traced,
  template: string | string[],
): Range[] {
  const keys = templateKeys(template)
  const ranges: Range[] = []
  let start = 0
  for (const line of markdown.text.split('\n')) {
    // Whatever lies between the authored parts came from the template.
    let from = 0
    for (const [s, e] of [
      ...authoredParts(keys, line),
      [line.length, line.length],
    ]) {
      if (s > from) {
        ranges.push(untrace(markdown, [start + from, start + s]))
      }
      from = e
    }
    start += line.length + 1
  }
  return ranges
}

const COMMENT = /<!--[\s\S]*?-->/g

function commentKey(comment: string) {
  return comment.replace(/\s+/g, ' ').trim()
}

/**
 * Where the HTML comments copied from the PR or issue templates are. Never
 * scored, as no comment is, but from the template all the same.
 */
export function templateComments(
  markdown: string,
  template: string | string[],
): Range[] {
  const templates = Array.isArray(template) ? template : [template]
  const keys = new Set(
    templates.flatMap((t) =>
      [...t.matchAll(COMMENT)].map((match) => commentKey(match[0])),
    ),
  )
  return [...markdown.matchAll(COMMENT)]
    .filter((match) => keys.has(commentKey(match[0])))
    .map((match) => [match.index, match.index + match[0].length])
}

/** Removes lines copied from the PR or issue templates, ticked checklist items included. */
export function withoutTemplate(text: string, template: string | string[]) {
  return traceWithoutTemplate(trace(text), template).text
}

const QUOTE_LINE = /^ {0,3}>.*$/gm

function filledLines(text: string) {
  return text.split('\n').filter((line) => /\S/.test(line)).length
}

/** Blanks out code and quotes. Quotes stay when they're most of the text. */
export function traceProse(text: Traced) {
  const withoutCode = traceReplace(
    traceReplace(text, /```[\s\S]*?```/g, ''),
    /^ {4,}(?![-*+] |\d+\. ).*$/gm,
    '',
  )
  const withoutQuotes = traceReplace(withoutCode, QUOTE_LINE, '')
  const mostlyQuote =
    filledLines(withoutQuotes.text) < filledLines(withoutCode.text) / 2
  return traceReplace(
    mostlyQuote ? withoutCode : withoutQuotes,
    /`[^`\n]*`/g,
    'X',
  )
}

/** `traceProse` for a plain string. */
export function prose(text: string) {
  return traceProse(trace(text)).text
}
