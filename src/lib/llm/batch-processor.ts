import type { LLMProviderInterface, TopicResult, FolderNameResult } from './types'
import type { TabInfo, BookmarkNode, OperationProgress } from '@/types/domain'
import {
  buildCategorizePrompt,
  buildTopicPrompt,
  buildFolderNamePrompt,
  buildSmartAssignPrompt,
  buildSmartCategorizePrompt,
  buildAnalyzeFoldersPrompt,
  buildReorganizeFolderPrompt,
  buildSmartGroupNamePrompt,
  type TabItem,
  type BookmarkItem,
  type ExistingFolder,
} from './prompt-builder'
import {
  parseCategoryResults,
  parseTopicResult,
  parseFolderNameResult,
  parseSmartCategoryResults,
  parseSmartAssignResults,
  parseFolderAnalysisResult,
  parseReorganizeFolderResult,
  parseSmartGroupNameResult,
  type FolderAnalysisResult,
  type ReorganizeFolderResult,
} from './response-parser'
import { splitIntoBatches } from '@/lib/utils/token-estimator'
import { retry, shouldRetryLLMRequest, sleep } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'

export interface BatchOptions {
  onProgress?: (progress: OperationProgress) => void
  concurrency?: number
  delayBetweenBatches?: number
}

export interface CategorizedTab {
  tab: TabInfo
  category: string
}

/**
 * Helper to strictly limit batch sizes to prevent LLM output truncation.
 * Even with large input context, output tokens are often limited (e.g. 4096).
 */
function enforceBatchLimit<T>(batches: T[][], limit: number): T[][] {
  return batches.flatMap(batch => {
    const chunks: T[][] = []
    for (let i = 0; i < batch.length; i += limit) {
      chunks.push(batch.slice(i, i + limit))
    }
    return chunks
  })
}

/**
 * Categorize tabs in batches
 */
export async function categorizeTabs(
  provider: LLMProviderInterface,
  tabs: TabInfo[],
  options: BatchOptions = {}
): Promise<CategorizedTab[]> {
  const { onProgress, concurrency = 2, delayBetweenBatches = 500 } = options
  const maxTokens = provider.config.maxContextTokens

  // Prepare items with indices
  const items: TabItem[] = tabs.map((tab, index) => ({
    index: index + 1,
    title: tab.title,
    url: tab.url,
  }))

  // Split into batches and enforce strict output limit (~25 for simple categorization)
  let batches = splitIntoBatches(items, maxTokens)
  batches = enforceBatchLimit(batches, 25)

  const results: CategorizedTab[] = []
  let processedBatches = 0

  logger.info(`Processing ${tabs.length} tabs in ${batches.length} batches`)

  // Process batches with limited concurrency
  for (let i = 0; i < batches.length; i += concurrency) {
    const batchGroup = batches.slice(i, i + concurrency)

    const batchResults = await Promise.all(
      batchGroup.map(async (batch) => {
        return retry(
          async () => {
            const messages = buildCategorizePrompt(batch)
            // Scale response tokens based on batch size (~10 tokens per item + buffer)
            const responseTokens = Math.min(1500, Math.max(300, batch.length * 15 + 100))
            const response = await provider.complete({ messages, maxTokens: responseTokens })
            return parseCategoryResults(response.content)
          },
          {
            maxRetries: 2,
            shouldRetry: shouldRetryLLMRequest,
            onRetry: (error, attempt) => {
              logger.warn(`Retry ${attempt} for batch`, { error })
            },
          }
        )
      })
    )

    // Map results back to tabs
    for (let j = 0; j < batchGroup.length; j++) {
      const batch = batchGroup[j]
      const categoryResults = batchResults[j] ?? []

      if (!batch) continue

      for (let k = 0; k < batch.length; k++) {
        const item = batch[k]
        if (!item) continue

        const tab = tabs[item.index - 1]

        // Robust Matching: Try global index -> local index -> position
        let result = categoryResults.find((r) => r.i === item.index)
        if (!result) result = categoryResults.find((r) => r.i === (k + 1))
        if (!result && categoryResults[k]) result = categoryResults[k]

        if (tab) {
          results.push({
            tab,
            category: result?.c ?? 'Other',
          })
        }
      }
    }

    processedBatches += batchGroup.length
    onProgress?.({
      current: processedBatches,
      total: batches.length,
      status: `Processing batch ${processedBatches}/${batches.length}`,
    })

    // Delay between batch groups
    if (i + concurrency < batches.length) {
      await sleep(delayBetweenBatches)
    }
  }

  return results
}

/**
 * Detect topic for a window's tabs
 */
export async function detectWindowTopic(
  provider: LLMProviderInterface,
  tabs: TabInfo[]
): Promise<TopicResult | null> {
  if (tabs.length === 0) return null

  const tabData = tabs.map((t) => ({ title: t.title, url: t.url }))
  const messages = buildTopicPrompt(tabData)

  try {
    const response = await retry(
      async () => provider.complete({ messages, maxTokens: 100 }),
      { maxRetries: 2, shouldRetry: shouldRetryLLMRequest }
    )
    return parseTopicResult(response.content)
  } catch (error) {
    logger.error('Failed to detect window topic', error)
    return null
  }
}

/**
 * Suggest folder name based on contents
 */
export async function suggestFolderName(
  provider: LLMProviderInterface,
  currentName: string,
  bookmarks: BookmarkNode[]
): Promise<FolderNameResult | null> {
  if (bookmarks.length === 0) return null

  const bookmarkData = bookmarks
    .filter((b) => b.url)
    .map((b) => ({ title: b.title, url: b.url! }))

  if (bookmarkData.length === 0) return null

  const messages = buildFolderNamePrompt(currentName, bookmarkData)

  try {
    const response = await retry(
      async () => provider.complete({ messages, maxTokens: 50 }),
      { maxRetries: 2, shouldRetry: shouldRetryLLMRequest }
    )
    return parseFolderNameResult(response.content)
  } catch (error) {
    logger.error('Failed to suggest folder name', error)
    return null
  }
}

/**
 * Batch process folder name suggestions
 */
export async function suggestFolderNames(
  provider: LLMProviderInterface,
  folders: Array<{ folder: BookmarkNode; bookmarks: BookmarkNode[] }>,
  options: BatchOptions = {}
): Promise<Array<{ folder: BookmarkNode; suggestedName: string | null }>> {
  const { onProgress, delayBetweenBatches = 500 } = options
  const results: Array<{ folder: BookmarkNode; suggestedName: string | null }> = []

  for (let i = 0; i < folders.length; i++) {
    const item = folders[i]
    if (!item) continue

    const result = await suggestFolderName(
      provider,
      item.folder.title,
      item.bookmarks
    )

    results.push({
      folder: item.folder,
      suggestedName: result?.name ?? null,
    })

    onProgress?.({
      current: i + 1,
      total: folders.length,
      status: `Processing folder ${i + 1}/${folders.length}`,
    })

    if (i < folders.length - 1) {
      await sleep(delayBetweenBatches)
    }
  }

  return results
}

// ============================================
// SMART AI CATEGORIZATION FUNCTIONS
// ============================================

export interface SmartCategorizedTab {
  tab: TabInfo
  topic: string
  subtopic: string
}

export interface SmartAssignedBookmark {
  bookmark: BookmarkNode
  targetFolder: string
  isNewFolder: boolean
  suggestedNewFolderName?: string
}

/**
 * Smart categorize tabs by topic and subtopic (not just domain)
 * Uses content analysis to group by meaning
 */
export async function smartCategorizeTabs(
  provider: LLMProviderInterface,
  tabs: TabInfo[],
  windowTopic?: string,
  options: BatchOptions = {}
): Promise<SmartCategorizedTab[]> {
  const { onProgress, concurrency = 2, delayBetweenBatches = 500 } = options
  const maxTokens = provider.config.maxContextTokens

  // Prepare items with indices
  const items: TabItem[] = tabs.map((tab, index) => ({
    index: index + 1,
    title: tab.title,
    url: tab.url,
  }))

  // Split into batches and enforce strict output limit (20 for verbose smart results)
  let batches = splitIntoBatches(items, Math.floor(maxTokens * 0.7))
  batches = enforceBatchLimit(batches, 20)

  const results: SmartCategorizedTab[] = []
  let processedBatches = 0

  logger.info(`Smart categorizing ${tabs.length} tabs in ${batches.length} batches`)

  for (let i = 0; i < batches.length; i += concurrency) {
    const batchGroup = batches.slice(i, i + concurrency)

    const batchResults = await Promise.all(
      batchGroup.map(async (batch) => {
        return retry(
          async () => {
            const messages = buildSmartCategorizePrompt(batch, windowTopic)
            // Scale response tokens based on batch size (~30 tokens per item for topic+subtopic + buffer)
            const responseTokens = Math.min(2500, Math.max(400, batch.length * 35 + 150))
            const response = await provider.complete({ messages, maxTokens: responseTokens })
            return parseSmartCategoryResults(response.content)
          },
          {
            maxRetries: 3,
            shouldRetry: shouldRetryLLMRequest,
            onRetry: (error, attempt) => {
              logger.warn(`Retry ${attempt} for smart categorize batch`, { error })
            },
          }
        )
      })
    )

    // Map results back to tabs
    for (let j = 0; j < batchGroup.length; j++) {
      const batch = batchGroup[j]
      const categoryResults = batchResults[j] ?? []

      if (!batch) continue

      for (let k = 0; k < batch.length; k++) {
        const item = batch[k]
        if (!item) continue

        const tab = tabs[item.index - 1]

        // Robust Matching: Try global index -> local index -> position
        let result = categoryResults.find((r) => r.i === item.index)
        if (!result) result = categoryResults.find((r) => r.i === (k + 1))
        if (!result && categoryResults[k]) result = categoryResults[k]

        if (tab) {
          results.push({
            tab,
            topic: result?.topic ?? 'Uncategorized',
            subtopic: result?.subtopic ?? 'General',
          })
        }
      }
    }

    processedBatches += batchGroup.length
    onProgress?.({
      current: processedBatches,
      total: batches.length,
      status: `Smart categorizing batch ${processedBatches}/${batches.length}`,
    })

    if (i + concurrency < batches.length) {
      await sleep(delayBetweenBatches)
    }
  }

  return results
}

/**
 * Smart assign orphan bookmarks to existing folders based on content/topic
 * Returns folder assignments with flags for new folder suggestions
 */
export async function smartAssignBookmarks(
  provider: LLMProviderInterface,
  bookmarks: BookmarkNode[],
  existingFolders: ExistingFolder[],
  options: BatchOptions = {}
): Promise<SmartAssignedBookmark[]> {
  const { onProgress, concurrency = 2, delayBetweenBatches = 500 } = options
  const maxTokens = provider.config.maxContextTokens

  // Prepare items with indices
  const items: BookmarkItem[] = bookmarks
    .filter((b) => b.url)
    .map((b, index) => ({
      id: b.id,
      index: index + 1,
      title: b.title,
      url: b.url!,
    }))

  // Split into batches and enforce strict output limit (~20 for bookmarks)
  let batches = splitIntoBatches(items, Math.floor(maxTokens * 0.6))
  batches = enforceBatchLimit(batches, 20)

  const results: SmartAssignedBookmark[] = []
  let processedBatches = 0

  logger.info(`Smart assigning ${items.length} bookmarks in ${batches.length} batches`)

  for (let i = 0; i < batches.length; i += concurrency) {
    const batchGroup = batches.slice(i, i + concurrency)

    const batchResults = await Promise.all(
      batchGroup.map(async (batch) => {
        return retry(
          async () => {
            const messages = buildSmartAssignPrompt(batch, existingFolders)
            // Scale response tokens based on batch size (~25 tokens per item + buffer)
            const responseTokens = Math.min(2000, Math.max(400, batch.length * 30 + 150))
            const response = await provider.complete({ messages, maxTokens: responseTokens })
            return parseSmartAssignResults(response.content)
          },
          {
            maxRetries: 2,
            shouldRetry: shouldRetryLLMRequest,
            onRetry: (error, attempt) => {
              logger.warn(`Retry ${attempt} for smart assign batch`, { error })
            },
          }
        )
      })
    )

    // Map results back to bookmarks
    for (let j = 0; j < batchGroup.length; j++) {
      const batch = batchGroup[j]
      const assignResults = batchResults[j] ?? []

      if (!batch) continue

      for (let k = 0; k < batch.length; k++) {
        const item = batch[k]
        if (!item) continue

        const bookmark = bookmarks.find((b) => b.id === item.id)

        // Robust Matching: Try global index -> local index -> position
        let result = assignResults.find((r) => r.i === item.index)
        if (!result) result = assignResults.find((r) => r.i === (k + 1))
        if (!result && assignResults[k]) result = assignResults[k]

        if (bookmark) {
          const folderValue = result?.folder ?? 'Uncategorized'
          const isNewFolder = folderValue.startsWith('new:')

          results.push({
            bookmark,
            targetFolder: isNewFolder ? folderValue.slice(4) : folderValue,
            isNewFolder,
            suggestedNewFolderName: isNewFolder ? folderValue.slice(4) : undefined,
          })
        }
      }
    }

    processedBatches += batchGroup.length
    onProgress?.({
      current: processedBatches,
      total: batches.length,
      status: `Smart assigning batch ${processedBatches}/${batches.length}`,
    })

    if (i + concurrency < batches.length) {
      await sleep(delayBetweenBatches)
    }
  }

  return results
}

/**
 * Analyze user's existing folder organization pattern
 * Helps understand their naming conventions and categories
 */
export async function analyzeUserFolders(
  provider: LLMProviderInterface,
  folders: Array<{ name: string; itemCount: number; sampleTitles: string[] }>
): Promise<FolderAnalysisResult | null> {
  if (folders.length === 0) return null

  const messages = buildAnalyzeFoldersPrompt(folders)

  try {
    const response = await retry(
      async () => provider.complete({ messages, maxTokens: 300 }),
      { maxRetries: 2, shouldRetry: shouldRetryLLMRequest }
    )
    return parseFolderAnalysisResult(response.content)
  } catch (error) {
    logger.error('Failed to analyze user folders', error)
    return null
  }
}

/**
 * Suggest how to reorganize a messy folder
 */
export async function suggestFolderReorganization(
  provider: LLMProviderInterface,
  folderName: string,
  bookmarks: BookmarkNode[],
  existingFolders: string[]
): Promise<ReorganizeFolderResult | null> {
  if (bookmarks.length === 0) return null

  const bookmarkData = bookmarks
    .filter((b) => b.url)
    .map((b) => ({ title: b.title, url: b.url! }))

  if (bookmarkData.length === 0) return null

  const messages = buildReorganizeFolderPrompt(folderName, bookmarkData, existingFolders)

  try {
    const response = await retry(
      async () => provider.complete({ messages, maxTokens: 800 }),
      { maxRetries: 2, shouldRetry: shouldRetryLLMRequest }
    )
    return parseReorganizeFolderResult(response.content)
  } catch (error) {
    logger.error('Failed to suggest folder reorganization', error)
    return null
  }
}

/**
 * Generate a smart, specific group name based on tab content
 */
export async function suggestSmartGroupName(
  provider: LLMProviderInterface,
  tabs: TabInfo[],
  category: string
): Promise<string | null> {
  if (tabs.length === 0) return null

  const tabData = tabs.map((t) => ({ title: t.title, url: t.url }))
  const messages = buildSmartGroupNamePrompt(tabData, category)

  try {
    const response = await retry(
      async () => provider.complete({ messages, maxTokens: 50 }),
      { maxRetries: 2, shouldRetry: shouldRetryLLMRequest }
    )
    const result = parseSmartGroupNameResult(response.content)
    return result?.name ?? null
  } catch (error) {
    logger.error('Failed to suggest smart group name', error)
    return null
  }
}

/**
 * Group tabs by topic/subtopic and return organized structure
 */
export function groupTabsByTopic(
  categorizedTabs: SmartCategorizedTab[]
): Map<string, Map<string, SmartCategorizedTab[]>> {
  const topicGroups = new Map<string, Map<string, SmartCategorizedTab[]>>()

  for (const item of categorizedTabs) {
    if (!topicGroups.has(item.topic)) {
      topicGroups.set(item.topic, new Map())
    }

    const subtopicMap = topicGroups.get(item.topic)!
    if (!subtopicMap.has(item.subtopic)) {
      subtopicMap.set(item.subtopic, [])
    }

    subtopicMap.get(item.subtopic)!.push(item)
  }

  return topicGroups
}

/**
 * Group bookmark assignments by target folder
 */
export function groupBookmarksByFolder(
  assignments: SmartAssignedBookmark[]
): Map<string, { bookmarks: SmartAssignedBookmark[]; isNew: boolean }> {
  const folderGroups = new Map<string, { bookmarks: SmartAssignedBookmark[]; isNew: boolean }>()

  for (const item of assignments) {
    const key = item.targetFolder

    if (!folderGroups.has(key)) {
      folderGroups.set(key, { bookmarks: [], isNew: item.isNewFolder })
    }

    folderGroups.get(key)!.bookmarks.push(item)
  }

  return folderGroups
}
