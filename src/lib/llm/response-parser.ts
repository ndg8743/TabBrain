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
  // Use any to be flexible with field names
  const parsed = safeParseJSON<any[]>(response)

  if (!parsed || !Array.isArray(parsed)) {
    logger.warn('Invalid category response format', { response })
    return []
  }

  return parsed
    .map((item, index) => {
      // Fix: Handle index as string or number, fallback to 1-based index
      let i = parseInt(item.i ?? item.id ?? item.index)
      if (isNaN(i)) {
        i = index + 1
      }

      // Handle various category keys
      const c = String(item.c ?? item.category ?? item.cat ?? 'Other')

      return {
        i,
        c: normalizeCategory(c),
      }
    })
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

// ============================================
// SMART AI CATEGORIZATION PARSERS
// ============================================

export interface SmartCategoryResult {
  i: number
  topic: string
  subtopic: string
}

export interface SmartAssignResult {
  i: number
  folder: string // Either existing folder name or "new:Suggested Name"
}

export interface FolderAnalysisResult {
  categories: string[]
  namingStyle: 'short' | 'descriptive' | 'emoji'
  topInterests: string[]
}

export interface ReorganizeFolderResult {
  moveToExisting: Array<{ item: number; targetFolder: string }>
  newSubfolders: Array<{ name: string; items: number[] }>
  keepInPlace: number[]
}

export interface SmartGroupNameResult {
  name: string
}

/**
 * Parse smart categorization results (topic + subtopic)
 */
export function parseSmartCategoryResults(response: string): SmartCategoryResult[] {
  const parsed = safeParseJSON<any[]>(response)

  if (!parsed || !Array.isArray(parsed)) {
    logger.warn('Invalid smart category response format', { response })
    return []
  }

  return parsed
    .map((item, index) => {
      // Fix: Lenient index parsing
      let i = parseInt(item.i ?? item.id ?? item.index)
      if (isNaN(i)) {
        i = index + 1
      }

      const topic = String(item.topic ?? item.category ?? item.c ?? item.t ?? 'Uncategorized').trim()
      const subtopic = String(item.subtopic ?? item.sub ?? item.s ?? 'General').trim()

      return { i, topic, subtopic }
    })
    .map((item) => ({
      i: item.i,
      topic: item.topic.slice(0, 50),
      subtopic: item.subtopic.slice(0, 50),
    }))
}

/**
 * Parse smart folder assignment results
 */
export function parseSmartAssignResults(response: string): SmartAssignResult[] {
  const parsed = safeParseJSON<any[]>(response)

  if (!parsed || !Array.isArray(parsed)) {
    logger.warn('Invalid smart assign response format', { response })
    return []
  }

  // Optimization: Use flatMap to map and filter in one pass
  return parsed.flatMap((item, index) => {
    let i = parseInt(item.i ?? item.id ?? item.index)
    if (isNaN(i)) {
      i = index + 1
    }

    const folder = String(item.folder ?? item.f ?? item.target ?? '')
    
    // Filter out items with empty folder strings
    if (folder.length === 0) {
      return []
    }

    return [{
      i,
      folder: folder.slice(0, 100),
    }]
  })
}

/**
 * Parse folder analysis results (user's organization pattern)
 */
export function parseFolderAnalysisResult(response: string): FolderAnalysisResult | null {
  const parsed = safeParseJSON<{
    categories: string[]
    namingStyle: string
    topInterests: string[]
  }>(response)

  if (!parsed || !Array.isArray(parsed.categories)) {
    logger.warn('Invalid folder analysis response format', { response })
    return null
  }

  const validStyles = ['short', 'descriptive', 'emoji'] as const
  const namingStyle = validStyles.includes(parsed.namingStyle as typeof validStyles[number])
    ? (parsed.namingStyle as 'short' | 'descriptive' | 'emoji')
    : 'descriptive'

  return {
    categories: parsed.categories.slice(0, 20).map((c) => String(c).slice(0, 50)),
    namingStyle,
    topInterests: (parsed.topInterests || []).slice(0, 10).map((i) => String(i).slice(0, 50)),
  }
}

/**
 * Parse folder reorganization suggestions
 */
export function parseReorganizeFolderResult(response: string): ReorganizeFolderResult | null {
  const parsed = safeParseJSON<{
    moveToExisting: any[]
    newSubfolders: any[]
    keepInPlace: any[]
  }>(response)

  if (!parsed) {
    logger.warn('Invalid reorganize folder response format', { response })
    return null
  }

  return {
    // Optimization: Use flatMap for cleaner filtering and mapping
    moveToExisting: (parsed.moveToExisting || []).flatMap((m) => {
      if (typeof m.item === 'number' && typeof m.targetFolder === 'string') {
        return [{ item: m.item, targetFolder: m.targetFolder.slice(0, 100) }]
      }
      return []
    }),
    // Optimization: Use flatMap
    newSubfolders: (parsed.newSubfolders || []).flatMap((s) => {
      if (typeof s.name === 'string' && Array.isArray(s.items)) {
        return [{ 
          name: s.name.slice(0, 100), 
          items: s.items.filter((i: any) => typeof i === 'number') 
        }]
      }
      return []
    }),
    keepInPlace: (parsed.keepInPlace || []).filter((i: any) => typeof i === 'number'),
  }
}

/**
 * Parse smart group name result
 */
export function parseSmartGroupNameResult(response: string): SmartGroupNameResult | null {
  const parsed = safeParseJSON<{ name: string }>(response)

  if (!parsed || typeof parsed.name !== 'string') {
    // Try to extract name
    const nameMatch = response.match(/"name"\s*:\s*"([^"]+)"/)
    if (nameMatch?.[1]) {
      return { name: nameMatch[1].slice(0, 50) }
    }
    logger.warn('Invalid smart group name response format', { response })
    return null
  }

  return { name: parsed.name.slice(0, 50) }
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
