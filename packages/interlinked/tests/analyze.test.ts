import { describe, expect, it } from 'vitest'
import { INSUFFICIENT_DATA_SCORE, analyzeText } from '../src/index'

describe('analyzeText', () => {
  it('has nothing to score when only the length counts', () => {
    for (const text of [
      '',
      'LGTM',
      'This fixes the inability to bulk-delete ciphers from org vault views.',
    ]) {
      expect(analyzeText(text)).toMatchObject({
        classification: 'insufficient-data',
        score: INSUFFICIENT_DATA_SCORE,
      })
    }
  })

  it('scores a short text that leans one way', () => {
    const result = analyzeText("not sure it's the right fix lol")
    expect(result.classification).toBe('organic')
    expect(result.score).toBeGreaterThanOrEqual(70)
  })
})
