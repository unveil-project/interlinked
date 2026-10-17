/** Removes text the author didn't write: HTML comments and bot summaries. */
export function authoredText(markdown: string) {
  return markdown
    .replace(
      /<!-- This is an auto-generated comment[\s\S]*?end of auto-generated comment[^>]*-->/g,
      '',
    )
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim()
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

/** Removes lines copied from the PR or issue templates, ticked checklist items included. */
export function withoutTemplate(text: string, template: string | string[]) {
  const templates = Array.isArray(template) ? template : [template]
  const templateLines = new Set(
    templates
      .flatMap((t) =>
        isIssueForm(t) ? issueFormLines(t) : authoredText(t).split('\n'),
      )
      .map(templateKey)
      .filter((line) => line.length > 2),
  )
  return text
    .split('\n')
    .filter((line) => !templateLines.has(templateKey(line)))
    .join('\n')
    .trim()
}

/** Blanks out code blocks and inline code. Indented list items stay. */
export function prose(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^ {4,}(?![-*+] |\d+\. ).*$/gm, '')
    .replace(/`[^`\n]*`/g, 'X')
}
