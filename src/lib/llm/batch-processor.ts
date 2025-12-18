import type { LLMProviderInterface, CategoryResult, TopicResult, FolderNameResult } from './types'
import type { TabInfo, BookmarkNode, OperationProgress } from '@/types/domain'
import { buildCategorizePrompt, buildTopicPrompt, buildFolderNamePrompt, type TabItem } from './prompt-builder'
import { parseCategoryResults, parseTopicResult, parseFolderNameResult } from './response-parser'
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

  // Split into batches
  const batches = splitIntoBatches(items, maxTokens)
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
            const response = await provider.complete({ messages, maxTokens: 500 })
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

      for (const item of batch ?? []) {
        const tab = tabs[item.index - 1]
        const result = categoryResults.find((r) => r.i === item.index)
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
