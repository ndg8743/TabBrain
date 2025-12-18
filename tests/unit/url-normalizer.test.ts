import { describe, it, expect } from 'vitest'
import {
  normalizeUrl,
  getDomain,
  getBaseDomain,
  isSameDomain,
  isInternalUrl,
  isValidHttpUrl,
} from '../../src/lib/algorithms/url-normalizer'

describe('URL Normalizer', () => {
  describe('normalizeUrl', () => {
    it('should strip www prefix', () => {
      expect(normalizeUrl('https://www.example.com')).toBe('example.com')
    })

    it('should strip trailing slash', () => {
      expect(normalizeUrl('https://example.com/')).toBe('example.com')
    })

    it('should strip tracking parameters', () => {
      expect(normalizeUrl('https://example.com?utm_source=test&id=123')).toBe(
        'example.com?id=123'
      )
    })

    it('should sort query parameters', () => {
      expect(normalizeUrl('https://example.com?b=2&a=1')).toBe(
        'example.com?a=1&b=2'
      )
    })

    it('should handle complex URLs', () => {
      const url = 'https://www.example.com/path/to/page?utm_source=google&id=123&fbclid=abc#section'
      expect(normalizeUrl(url)).toBe('example.com/path/to/page?id=123')
    })

    it('should lowercase hostname', () => {
      expect(normalizeUrl('https://EXAMPLE.COM/Path')).toBe('example.com/Path')
    })

    it('should preserve path case by default', () => {
      expect(normalizeUrl('https://example.com/MyPath')).toBe('example.com/MyPath')
    })
  })

  describe('getDomain', () => {
    it('should extract domain from URL', () => {
      expect(getDomain('https://www.example.com/path')).toBe('example.com')
    })

    it('should handle subdomains', () => {
      expect(getDomain('https://blog.example.com')).toBe('blog.example.com')
    })

    it('should return original on invalid URL', () => {
      expect(getDomain('not-a-url')).toBe('not-a-url')
    })
  })

  describe('getBaseDomain', () => {
    it('should get base domain', () => {
      expect(getBaseDomain('https://blog.example.com')).toBe('example.com')
    })

    it('should handle .co.uk domains', () => {
      expect(getBaseDomain('https://www.example.co.uk')).toBe('example.co.uk')
    })
  })

  describe('isSameDomain', () => {
    it('should return true for same domain', () => {
      expect(isSameDomain('https://example.com/a', 'https://example.com/b')).toBe(true)
    })

    it('should return false for different domains', () => {
      expect(isSameDomain('https://example.com', 'https://other.com')).toBe(false)
    })

    it('should treat www as same domain', () => {
      expect(isSameDomain('https://www.example.com', 'https://example.com')).toBe(true)
    })
  })

  describe('isInternalUrl', () => {
    it('should detect chrome:// URLs', () => {
      expect(isInternalUrl('chrome://extensions')).toBe(true)
    })

    it('should detect chrome-extension:// URLs', () => {
      expect(isInternalUrl('chrome-extension://abc123')).toBe(true)
    })

    it('should not detect http URLs as internal', () => {
      expect(isInternalUrl('https://example.com')).toBe(false)
    })
  })

  describe('isValidHttpUrl', () => {
    it('should return true for http URLs', () => {
      expect(isValidHttpUrl('http://example.com')).toBe(true)
    })

    it('should return true for https URLs', () => {
      expect(isValidHttpUrl('https://example.com')).toBe(true)
    })

    it('should return false for chrome URLs', () => {
      expect(isValidHttpUrl('chrome://settings')).toBe(false)
    })

    it('should return false for invalid URLs', () => {
      expect(isValidHttpUrl('not-a-url')).toBe(false)
    })
  })
})
