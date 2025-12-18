import type { LLMMessage } from './types'

export const CATEGORIES = [
  'Technology',
  'Shopping',
  'News',
  'Entertainment',
  'Social',
  'Finance',
  'Reference',
  'Productivity',
  'Other',
] as const

export type Category = typeof CATEGORIES[number]

// System prompts - kept minimal for small models
const SYSTEM_PROMPTS = {
  categorize: 'You categorize browser tabs. Output ONLY valid JSON arrays. No explanations.',
  topic: 'You analyze browser tabs and suggest topic labels. Output ONLY valid JSON. No explanations.',
  folder: 'You suggest folder names for bookmarks. Output ONLY valid JSON. No explanations.',
}

export interface TabItem {
  index: number
  title: string
  url: string
}

export function buildCategorizePrompt(items: TabItem[]): LLMMessage[] {
  const itemList = items
    .map((item) => `${item.index}. "${truncate(item.title, 60)}" | ${truncateDomain(item.url)}`)
    .join('\n')

  const userPrompt = `Categorize each item into exactly ONE category.

Categories: ${CATEGORIES.join(', ')}

Items:
${itemList}

Example output:
[{"i":1,"c":"Shopping"},{"i":2,"c":"Technology"},{"i":3,"c":"News"}]

Output JSON array only:`

  return [
    { role: 'system', content: SYSTEM_PROMPTS.categorize },
    { role: 'user', content: userPrompt },
  ]
}

export function buildTopicPrompt(tabs: Array<{ title: string; url: string }>): LLMMessage[] {
  const tabList = tabs
    .slice(0, 15) // Limit to 15 tabs for topic detection
    .map((tab, i) => `${i + 1}. "${truncate(tab.title, 60)}" | ${truncateDomain(tab.url)}`)
    .join('\n')

  const userPrompt = `Analyze these browser tabs and suggest ONE topic label (2-4 words) for this window.

Tabs:
${tabList}

Examples of good topic labels:
- "React State Management"
- "Home Renovation Ideas"
- "Python Machine Learning"
- "Job Search NYC"

Respond with ONLY this JSON format:
{"topic": "your 2-4 word topic here", "confidence": 0.85}`

  return [
    { role: 'system', content: SYSTEM_PROMPTS.topic },
    { role: 'user', content: userPrompt },
  ]
}

export function buildFolderNamePrompt(
  currentName: string,
  bookmarks: Array<{ title: string; url: string }>
): LLMMessage[] {
  const bookmarkList = bookmarks
    .slice(0, 10) // Limit to 10 bookmarks
    .map((b, i) => `${i + 1}. "${truncate(b.title, 50)}" | ${truncateDomain(b.url)}`)
    .join('\n')

  const userPrompt = `These bookmarks are in a folder called "${currentName}". Suggest a better name (2-4 words).

Bookmarks:
${bookmarkList}

Respond ONLY with: {"name": "suggested folder name"}`

  return [
    { role: 'system', content: SYSTEM_PROMPTS.folder },
    { role: 'user', content: userPrompt },
  ]
}

export function buildSimpleCategorizePrompt(
  title: string,
  url: string
): LLMMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPTS.categorize },
    {
      role: 'user',
      content: `Categorize this tab: "${truncate(title, 60)}" | ${truncateDomain(url)}

Categories: ${CATEGORIES.join(', ')}

Respond with the category name only:`,
    },
  ]
}

// Helper functions
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

function truncateDomain(url: string): string {
  try {
    const parsed = new URL(url)
    const domain = parsed.hostname.replace(/^www\./, '')
    const path = parsed.pathname
    const truncatedPath = path.length > 30 ? path.slice(0, 27) + '...' : path
    return domain + truncatedPath
  } catch {
    return truncate(url, 50)
  }
}
