import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  SIGNALS,
  analyzeText,
  locateSignals,
  locateTemplate,
} from '../src/index'
import { withoutTemplate } from '../src/text'

/** The matched text of each location of one signal. */
function found(markdown: string, id: string, template?: string) {
  return locateSignals(markdown, { template }, [id]).map(({ start, end }) =>
    markdown.slice(start, end),
  )
}

describe('locateSignals', () => {
  it('finds matches at their offsets in the original text', () => {
    const text = 'Fixes the cache — stale entries stayed — after a flush.'
    expect(found(text, 'em-dash')).toEqual(['—', '—'])
  })

  it('keeps offsets past removed HTML comments', () => {
    const text = '<!-- a comment — with a dash -->\nFixes it — finally.'
    const locations = locateSignals(text, {}, ['em-dash'])
    expect(locations).toHaveLength(1)
    expect(locations[0].start).toBe(text.lastIndexOf('—'))
  })

  it('skips template lines', () => {
    const template = '## Summary\n\n## Validation'
    const text = '## Summary\nFixed it.\n\n## Validation\nRan it.'
    expect(found(text, 'template-headings')).toEqual([
      '## Summary',
      '## Validation',
    ])
    expect(found(text, 'template-headings', template)).toEqual([])
  })

  it('skips code for prose signals', () => {
    const text =
      'Use it — like so.\n\n```\nconst a = b — c\n```\nAnd `x — y` too.'
    expect(found(text, 'em-dash')).toEqual(['—'])
    expect(text.indexOf('—')).toBe(
      locateSignals(text, {}, ['em-dash'])[0].start,
    )
  })

  it('locates whole lines for line signals', () => {
    const text =
      'This sentence has no final punctuation at all\nThis one is fine, it ends with a period.'
    expect(found(text, 'unpunctuated-lines')).toEqual([
      'This sentence has no final punctuation at all',
    ])
  })

  it('has no locations for signals about the whole text', () => {
    expect(locateSignals('Short.', {}, ['short-body'])).toEqual([])
  })
})

describe('locateSignals on the fixtures', () => {
  const root = join(import.meta.dirname, 'fixtures')
  const locatable = new Set(
    SIGNALS.filter((s) => s.locate || 'ranges' in s.count).map((s) => s.id),
  )
  const fixtures = ['ai', 'human'].flatMap((label) =>
    readdirSync(join(root, label))
      .filter((file) => file.endsWith('.md') && !file.endsWith('.template.md'))
      .map((file) => join(root, label, file)),
  )

  it.each(fixtures)('locates every fired signal in %s', (path) => {
    const markdown = readFileSync(path, 'utf8')
    const templatePath = path.replace(/\.md$/, '.template.md')
    const template = existsSync(templatePath)
      ? readFileSync(templatePath, 'utf8')
      : undefined
    const { signals } = analyzeText(markdown, { template })
    const locations = locateSignals(
      markdown,
      { template },
      signals.map((s) => s.id),
    )
    for (const { start, end } of locations) {
      expect(start).toBeGreaterThanOrEqual(0)
      expect(end).toBeLessThanOrEqual(markdown.length)
    }
    const located = new Set(locations.map((l) => l.id))
    const missing = signals
      .map((s) => s.id)
      .filter((id) => locatable.has(id) && !located.has(id))
    expect(missing).toEqual([])
  })
})

describe('locateTemplate', () => {
  it('finds the lines copied from the template', () => {
    const template = '## Summary\n\n- [ ] Tests pass'
    const text = '<!-- hi -->\n## Summary\nFixed it.\n- [x] Tests pass'
    expect(
      locateTemplate(text, template).map(({ start, end }) =>
        text.slice(start, end),
      ),
    ).toEqual(['## Summary', '- [x] Tests pass'])
  })

  it('finds the HTML comments copied from the template', () => {
    const template = '<!--\nRead the  guidelines.\n-->\n## Summary'
    const text =
      '<!-- Read the guidelines. -->\n## Summary\n<!-- my own note -->\nFixed it.'
    expect(
      locateTemplate(text, template).map(({ start, end }) =>
        text.slice(start, end),
      ),
    ).toEqual(['<!-- Read the guidelines. -->', '## Summary'])
  })

  it('finds the template cells of table rows, not the filled-in answers', () => {
    const template =
      '| Q | A\n| --- | ---\n| Fixed Issues? | `Fixes #1`\n| Patch: Bug Fix? |\n| License | MIT'
    const text =
      '| Q | A\n| --- | ---\n| Fixed Issues? |\n| Patch: Bug Fix? | Yes, the cache one\n| License | MIT |\n| My own row | here'
    expect(
      locateTemplate(text, template).map(({ start, end }) =>
        text.slice(start, end),
      ),
    ).toEqual([
      '| Q | A',
      '| --- | ---',
      '| Fixed Issues? |',
      '| Patch: Bug Fix? | ',
      '| License | MIT |',
    ])
    expect(withoutTemplate(text, template)).toBe(
      'Yes, the cache one\n| My own row | here',
    )
  })
})
