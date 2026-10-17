import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SIGNALS, analyzeText, locateSignals } from '../src/index'

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
