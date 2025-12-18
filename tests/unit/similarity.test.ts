import { describe, it, expect } from 'vitest'
import {
  levenshteinDistance,
  levenshteinSimilarity,
  jaccardSimilarity,
  jaccardStringSimilarity,
  cosineSimilarity,
  tokenize,
  domainOverlap,
} from '../../src/lib/algorithms/similarity'

describe('Similarity Algorithms', () => {
  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0)
    })

    it('should return string length for empty comparison', () => {
      expect(levenshteinDistance('hello', '')).toBe(5)
      expect(levenshteinDistance('', 'hello')).toBe(5)
    })

    it('should calculate correct distance', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3)
    })

    it('should handle single character changes', () => {
      expect(levenshteinDistance('cat', 'bat')).toBe(1)
    })
  })

  describe('levenshteinSimilarity', () => {
    it('should return 1 for identical strings', () => {
      expect(levenshteinSimilarity('hello', 'hello')).toBe(1)
    })

    it('should return 0 for completely different strings', () => {
      expect(levenshteinSimilarity('abc', 'xyz')).toBe(0)
    })

    it('should return value between 0 and 1', () => {
      const similarity = levenshteinSimilarity('hello', 'hallo')
      expect(similarity).toBeGreaterThan(0)
      expect(similarity).toBeLessThan(1)
    })
  })

  describe('jaccardSimilarity', () => {
    it('should return 1 for identical sets', () => {
      const set = new Set(['a', 'b', 'c'])
      expect(jaccardSimilarity(set, set)).toBe(1)
    })

    it('should return 0 for disjoint sets', () => {
      const set1 = new Set(['a', 'b'])
      const set2 = new Set(['c', 'd'])
      expect(jaccardSimilarity(set1, set2)).toBe(0)
    })

    it('should calculate correct overlap', () => {
      const set1 = new Set(['a', 'b', 'c'])
      const set2 = new Set(['b', 'c', 'd'])
      expect(jaccardSimilarity(set1, set2)).toBe(0.5) // 2/4
    })

    it('should handle empty sets', () => {
      expect(jaccardSimilarity(new Set(), new Set())).toBe(1)
    })
  })

  describe('jaccardStringSimilarity', () => {
    it('should compare strings by word tokens', () => {
      const similarity = jaccardStringSimilarity(
        'hello world',
        'hello there'
      )
      expect(similarity).toBeGreaterThan(0)
      expect(similarity).toBeLessThan(1)
    })

    it('should return 1 for identical strings', () => {
      expect(jaccardStringSimilarity('hello world', 'hello world')).toBe(1)
    })
  })

  describe('cosineSimilarity', () => {
    it('should return 1 for identical strings', () => {
      expect(cosineSimilarity('hello world', 'hello world')).toBeCloseTo(1)
    })

    it('should return 0 for completely different strings', () => {
      expect(cosineSimilarity('aaa bbb', 'xxx yyy')).toBe(0)
    })

    it('should handle repeated words', () => {
      const similarity = cosineSimilarity('test test test', 'test')
      expect(similarity).toBeGreaterThan(0)
    })
  })

  describe('tokenize', () => {
    it('should split on whitespace', () => {
      expect(tokenize('hello world')).toEqual(['hello', 'world'])
    })

    it('should lowercase tokens', () => {
      expect(tokenize('Hello World')).toEqual(['hello', 'world'])
    })

    it('should remove punctuation', () => {
      expect(tokenize('hello, world!')).toEqual(['hello', 'world'])
    })

    it('should handle empty string', () => {
      expect(tokenize('')).toEqual([])
    })
  })

  describe('domainOverlap', () => {
    it('should return 1 for identical domains', () => {
      const urls1 = ['https://example.com/a', 'https://example.com/b']
      const urls2 = ['https://example.com/c', 'https://example.com/d']
      expect(domainOverlap(urls1, urls2)).toBe(1)
    })

    it('should return 0 for no overlap', () => {
      const urls1 = ['https://example.com']
      const urls2 = ['https://other.com']
      expect(domainOverlap(urls1, urls2)).toBe(0)
    })

    it('should calculate partial overlap', () => {
      const urls1 = ['https://a.com', 'https://b.com']
      const urls2 = ['https://b.com', 'https://c.com']
      expect(domainOverlap(urls1, urls2)).toBeCloseTo(1 / 3) // 1 overlap / 3 unique
    })
  })
})
