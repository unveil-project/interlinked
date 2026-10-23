import {
  HTML_COMMENT,
  type Range,
  type Traced,
  authoredText,
  trace,
  traceTrim,
  untrace,
} from './text'

/** A repo's PR template, or its issue templates. */
export type Template = string | string[]

interface TemplateKeys {
  lines: Set<string>
  /** Per table row's first cell, the `column:cell` keys of its cells. */
  rows: Map<string, Set<string>>
}

/** A line as a template key: no ticks, strike-through or list markers. */
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
  return value.trim().replace(/^(["'])(.*)\1$/, '$2')
}

function isIssueForm(template: string) {
  return /^body:\s*$/m.test(template) && /^\s*-\s+type:/m.test(template)
}

/** The lines a YAML issue form leaves in an issue. */
export function issueFormLines(yaml: string) {
  const lines = ['_No response_']
  const rows = yaml.split('\n')
  for (let i = 0; i < rows.length; i++) {
    const field = rows[i].match(/^(\s*)(-\s+)?(label|value):\s*(.*)$/)
    if (!field) {
      const option = rows[i].match(/^\s*-\s+(?![\w-]+:(?:\s|$))(.+)$/)
      if (option) {
        lines.push(unquote(option[1]))
      }
      continue
    }
    const [, indent, listItem, key, value] = field
    const isBlock = /^[|>][-+]?$/.test(value.trim())
    if (isBlock) {
      while (
        i + 1 < rows.length &&
        (rows[i + 1].trim() === '' || rows[i + 1].search(/\S/) > indent.length)
      ) {
        lines.push(rows[++i].trim())
      }
    } else if (key === 'label' && listItem) {
      lines.push(`- [ ] ${unquote(value)}`)
    } else if (key === 'label') {
      lines.push(`### ${unquote(value)}`)
    } else {
      lines.push(unquote(value))
    }
  }
  return lines
}

/** A table row's cells as ranges in the line, or `undefined` for other lines. */
function tableCells(line: string): Range[] | undefined {
  if (!/^\s*\|/.test(line)) {
    return undefined
  }
  const pipes = [...line.matchAll(/(?<!\\)\|/g)].map((match) => match.index)
  return pipes.map((pipe, i) => [pipe + 1, pipes[i + 1] ?? line.length])
}

function templateKeys(template: Template): TemplateKeys {
  const lines = [template]
    .flat()
    .flatMap((t) =>
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
    lines: new Set(lines.map(templateKey).filter((key) => key.length > 2)),
    rows,
  }
}

/**
 * The parts of a line the author wrote: none for a template line, all of it
 * for others. A template table row keeps only the cells that differ.
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

/** Removes what was copied from the template. Kept cells are joined by a space. */
export function traceWithoutTemplate(
  { text, offsets }: Traced,
  template: Template,
) {
  const keys = templateKeys(template)
  const kept: Traced[] = []
  let start = 0
  for (const line of text.split('\n')) {
    const parts = authoredParts(keys, line)
    const lineOffsets = offsets.slice(start, start + line.length + 1)
    if (parts.length > 0) {
      kept.push({
        text: parts.map(([s, e]) => line.slice(s, e)).join(' '),
        offsets: [
          ...parts.flatMap(([s, e], i) => [
            ...(i > 0 ? [lineOffsets[s]] : []),
            ...lineOffsets.slice(s, e),
          ]),
          ...lineOffsets.slice(line.length),
        ],
      })
    }
    start += line.length + 1
  }
  const last = kept.length - 1
  return traceTrim({
    text: kept.map((line) => line.text).join('\n'),
    offsets: kept.flatMap((line, i) =>
      i < last ? line.offsets : line.offsets.slice(0, line.text.length),
    ),
  })
}

export function withoutTemplate(text: string, template: Template) {
  return traceWithoutTemplate(trace(text), template).text
}

/** Where the text copied from the template is: the gaps between authored parts. */
export function traceTemplateLines(
  markdown: Traced,
  template: Template,
): Range[] {
  const keys = templateKeys(template)
  const ranges: Range[] = []
  let start = 0
  for (const line of markdown.text.split('\n')) {
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

function commentKey(comment: string) {
  return comment.replace(/\s+/g, ' ').trim()
}

/** Where the HTML comments copied from the template are. */
export function templateComments(
  markdown: string,
  template: Template,
): Range[] {
  const keys = new Set(
    [template]
      .flat()
      .flatMap((t) =>
        [...t.matchAll(HTML_COMMENT)].map((match) => commentKey(match[0])),
      ),
  )
  return [...markdown.matchAll(HTML_COMMENT)]
    .filter((match) => keys.has(commentKey(match[0])))
    .map((match) => [match.index, match.index + match[0].length])
}
