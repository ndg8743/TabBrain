import type { CategoryResult, TopicResult, FolderNameResult } from './types'
import { CATEGORIES, type Category } from './prompt-builder'
import { logger } from '@/lib/utils/logger'

/**
 * Extract JSON from a response that may contain extra text
 */
export function extractJSON(text: string): string {
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '')

  // Find JSON array or object
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
  const objectMatch = cleaned.match(/\{[\s\S]*\}/)

  if (arrayMatch) {
    cleaned = arrayMatch[0]
  } else if (objectMatch) {
    cleaned = objectMatch[0]
  }

  return cleaned.trim()
}

/**
 * Fix common JSON errors from small models
 */
export function fixJSON(text: string): string {
  let fixed = text

  // Replace single quotes with double quotes (for keys and string values)
  fixed = fixed.replace(/'/g, '"')

  // Remove trailing commas before ] or }
  fixed = fixed.replace(/,\s*([}\]])/g, '$1')

  // Add quotes to unquoted keys
  fixed = fixed.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')

  return fixed
}

/**
 * Parse JSON safely with error recovery
 */
export function safeParseJSON<T>(text: string): T | null {
  const extracted = extractJSON(text)

  // Try parsing as-is first
  try {
    return JSON.parse(extracted) as T
  } catch {
    // Try with fixes
    try {
      const fixed = fixJSON(extracted)
      return JSON.parse(fixed) as T
    } catch (error) {
      logger.warn('Failed to parse JSON', { text, error })
      return null
    }
  }
}

/**
 * Parse category results from LLM response
 */
export function parseCategoryResults(response: string): CategoryResult[] {
  const parsed = safeParseJSON<Array<{ i: number; c: string }>>(response)

  if (!parsed || !Array.isArray(parsed)) {
    logger.warn('Invalid category response format', { response })
    return []
  }

  return parsed
    .filter((item) => typeof item.i === 'number' && typeof item.c === 'string')
    .map((item) => ({
      i: item.i,
      c: normalizeCategory(item.c),
    }))
}

/**
 * Parse topic result from LLM response
 */
export function parseTopicResult(response: string): TopicResult | null {
  const parsed = safeParseJSON<{ topic: string; confidence?: number }>(response)

  if (!parsed || typeof parsed.topic !== 'string') {
    // Try to extract a simple topic string
    const topicMatch = response.match(/"topic"\s*:\s*"([^"]+)"/)
    if (topicMatch?.[1]) {
      return {
        topic: topicMatch[1],
        confidence: 0.5,
      }
    }

    logger.warn('Invalid topic response format', { response })
    return null
  }

  return {
    topic: parsed.topic.slice(0, 50), // Limit length
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
  }
}

/**
 * Parse folder name result from LLM response
 */
export function parseFolderNameResult(response: string): FolderNameResult | null {
  const parsed = safeParseJSON<{ name: string }>(response)

  if (!parsed || typeof parsed.name !== 'string') {
    // Try to extract a simple name string
    const nameMatch = response.match(/"name"\s*:\s*"([^"]+)"/)
    if (nameMatch?.[1]) {
      return { name: nameMatch[1] }
    }

    logger.warn('Invalid folder name response format', { response })
    return null
  }

  return {
    name: parsed.name.slice(0, 50), // Limit length
  }
}

/**
 * Parse a simple category response (single word)
 */
export function parseSimpleCategory(response: string): Category | null {
  const cleaned = response.trim().replace(/['"]/g, '')

  const category = CATEGORIES.find(
    (c) => c.toLowerCase() === cleaned.toLowerCase()
  )

  if (category) return category

  // Try partial match
  const partial = CATEGORIES.find((c) =>
    cleaned.toLowerCase().includes(c.toLowerCase())
  )

  return partial ?? null
}

/**
 * Normalize a category string to a valid category
 */
function normalizeCategory(input: string): string {
  const cleaned = input.trim()

  // Try exact match
  const exact = CATEGORIES.find(
    (c) => c.toLowerCase() === cleaned.toLowerCase()
  )
  if (exact) return exact

  // Try partial match
  const partial = CATEGORIES.find((c) =>
    cleaned.toLowerCase().includes(c.toLowerCase())
  )
  if (partial) return partial

  // Map common aliases
  const aliases: Record<string, Category> = {
    tech: 'Technology',
    development: 'Technology',
    programming: 'Technology',
    coding: 'Technology',
    shop: 'Shopping',
    ecommerce: 'Shopping',
    'e-commerce': 'Shopping',
    media: 'Entertainment',
    video: 'Entertainment',
    music: 'Entertainment',
    games: 'Entertainment',
    gaming: 'Entertainment',
    social_media: 'Social',
    socialmedia: 'Social',
    money: 'Finance',
    banking: 'Finance',
    investment: 'Finance',
    docs: 'Reference',
    documentation: 'Reference',
    wiki: 'Reference',
    work: 'Productivity',
    tools: 'Productivity',
  }

  const normalized = cleaned.toLowerCase().replace(/[^a-z]/g, '')
  const alias = aliases[normalized]
  if (alias) return alias

  return 'Other'
}
