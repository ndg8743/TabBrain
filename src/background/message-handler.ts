import type { TabInfo, OperationProgress, SortOptions, TabGroupOptions } from '@/types/domain'
import { getAllTabs, getTabsInWindow, closeTabs, groupTabs, sortTabsByDomain, sortTabs, sortAllTabs } from '@/lib/chrome/tabs'
import { getAllWindows, mergeWindows } from '@/lib/chrome/windows'
import { getBookmarkTree, getAllBookmarkUrls, getAllFolders, renameBookmark, removeBookmark, isGenericFolderName, getBookmarkChildren, findOrphanBookmarks, findLargeFolders } from '@/lib/chrome/bookmarks'
import { getCategoryColor } from '@/lib/chrome/tab-groups'
import { getLLMConfig } from '@/lib/chrome/storage'
import { findDuplicateTabs, findDuplicateBookmarks } from '@/lib/algorithms/clustering'
import { domainOverlap } from '@/lib/algorithms/similarity'
import { OpenAICompatibleProvider } from '@/lib/llm/openai-compatible'
import {
  categorizeTabs,
  detectWindowTopic,
  suggestFolderName,
  smartCategorizeTabs,
  smartAssignBookmarks,
  analyzeUserFolders,
  suggestFolderReorganization,
  suggestSmartGroupName,
} from '@/lib/llm/batch-processor'
import type { ExistingFolder } from '@/lib/llm/prompt-builder'
import { logger } from '@/lib/utils/logger'

// Message types
export type MessageType =
  | 'GET_ALL_TABS'
  | 'GET_ALL_WINDOWS'
  | 'FIND_DUPLICATE_TABS'
  | 'CLOSE_TABS'
  | 'SORT_TABS_BY_DOMAIN'
  | 'SORT_TABS'
  | 'SORT_ALL_TABS'
  | 'CREATE_TAB_GROUPS'
  | 'DETECT_WINDOW_TOPIC'
  | 'FIND_MERGE_SUGGESTIONS'
  | 'MERGE_WINDOWS'
  | 'GET_BOOKMARK_TREE'
  | 'FIND_DUPLICATE_BOOKMARKS'
  | 'RENAME_BOOKMARK'
  | 'REMOVE_BOOKMARKS'
  | 'GET_FOLDER_SUGGESTIONS'
  | 'CHECK_DEAD_LINKS'
  | 'CATEGORIZE_TABS'
  | 'GET_LLM_CONFIG'
  | 'TEST_LLM_CONNECTION'
  | 'GET_AVAILABLE_MODELS'
  | 'FIND_ORPHAN_BOOKMARKS'
  | 'FIND_LARGE_FOLDERS'
  // Smart AI categorization
  | 'SMART_CATEGORIZE_TABS'
  | 'SMART_ASSIGN_BOOKMARKS'
  | 'ANALYZE_USER_FOLDERS'
  | 'SUGGEST_FOLDER_REORGANIZATION'
  | 'SUGGEST_SMART_GROUP_NAME'

export interface Message<T extends MessageType = MessageType> {
  type: T
  payload?: unknown
}

export interface MessageResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MessageHandler = (payload: any) => Promise<unknown>

const handlers: Partial<Record<MessageType, MessageHandler>> = {
  GET_ALL_TABS: async () => {
    return getAllTabs()
  },

  GET_ALL_WINDOWS: async () => {
    return getAllWindows()
  },

  FIND_DUPLICATE_TABS: async () => {
    const tabs = await getAllTabs()
    return findDuplicateTabs(tabs)
  },

  CLOSE_TABS: async (payload: { tabIds: number[] }) => {
    await closeTabs(payload.tabIds)
    return { closed: payload.tabIds.length }
  },

  SORT_TABS_BY_DOMAIN: async (payload: { windowId: number }) => {
    await sortTabsByDomain(payload.windowId)
    return { sorted: true }
  },

  SORT_TABS: async (payload: { windowId: number; options?: Partial<SortOptions> }) => {
    await sortTabs(payload.windowId, payload.options)
    return { sorted: true }
  },

  SORT_ALL_TABS: async (payload: { options?: Partial<SortOptions> }) => {
    await sortAllTabs(payload.options)
    return { sorted: true }
  },

  CREATE_TAB_GROUPS: async (payload: {
    categorizedTabs: Array<{ tab: TabInfo; category: string; subtopic?: string }>
    windowId: number
    options?: Partial<TabGroupOptions>
  }) => {
    const { categorizedTabs, windowId, options } = payload
    const minTabs = options?.minTabsForGroup ?? 2
    const useSubtopics = options?.useAISubtopics ?? false
    const collapseGroups = options?.collapseGroupsOnCreate ?? false

    // Group tabs by category (or subtopic if enabled)
    const byCategory = new Map<string, { tabs: TabInfo[]; displayName: string }>()
    for (const { tab, category, subtopic } of categorizedTabs) {
      if (tab.windowId !== windowId) continue
      if (tab.pinned) continue

      const key = category
      const displayName = useSubtopics && subtopic ? subtopic : category

      const existing = byCategory.get(key)
      if (existing) {
        existing.tabs.push(tab)
      } else {
        byCategory.set(key, { tabs: [tab], displayName })
      }
    }

    // Create groups for categories meeting the minimum threshold
    const created: string[] = []
    const groupIds: number[] = []
    for (const [category, { tabs, displayName }] of byCategory) {
      if (tabs.length < minTabs) continue

      const groupId = await groupTabs(
        tabs.map((t) => t.id),
        { title: displayName, color: getCategoryColor(category), windowId }
      )
      created.push(displayName)
      if (groupId !== -1) {
        groupIds.push(groupId)
      }
    }

    // Collapse groups if requested
    if (collapseGroups && groupIds.length > 0) {
      for (const groupId of groupIds) {
        await chrome.tabGroups.update(groupId, { collapsed: true })
      }
    }

    return { groupsCreated: created }
  },

  DETECT_WINDOW_TOPIC: async (payload: { windowId: number }) => {
    const config = await getLLMConfig()
    if (!config) {
      throw new Error('LLM not configured')
    }

    const provider = new OpenAICompatibleProvider(config)
    const tabs = await getTabsInWindow(payload.windowId)
    return detectWindowTopic(provider, tabs)
  },

  FIND_MERGE_SUGGESTIONS: async (payload?: { overlapThreshold?: number }) => {
    const threshold = payload?.overlapThreshold ?? 0.5
    const windows = await getAllWindows()
    const suggestions: Array<{
      sourceId: number
      targetId: number
      overlap: number
    }> = []

    for (let i = 0; i < windows.length; i++) {
      for (let j = i + 1; j < windows.length; j++) {
        const win1 = windows[i]
        const win2 = windows[j]
        if (!win1 || !win2) continue

        const urls1 = win1.tabs.map((t) => t.url)
        const urls2 = win2.tabs.map((t) => t.url)
        const overlap = domainOverlap(urls1, urls2)

        if (overlap >= threshold) {
          suggestions.push({
            sourceId: win1.tabs.length < win2.tabs.length ? win1.id : win2.id,
            targetId: win1.tabs.length < win2.tabs.length ? win2.id : win1.id,
            overlap,
          })
        }
      }
    }

    return suggestions
  },

  MERGE_WINDOWS: async (payload: { sourceId: number; targetId: number }) => {
    await mergeWindows(payload.sourceId, payload.targetId)
    return { merged: true }
  },

  GET_BOOKMARK_TREE: async () => {
    return getBookmarkTree()
  },

  FIND_DUPLICATE_BOOKMARKS: async () => {
    const tree = await getBookmarkTree()
    const bookmarks = getAllBookmarkUrls(tree)
    return findDuplicateBookmarks(bookmarks)
  },

  RENAME_BOOKMARK: async (payload: { id: string; title: string }) => {
    await renameBookmark(payload.id, payload.title)
    return { renamed: true }
  },

  REMOVE_BOOKMARKS: async (payload: { ids: string[] }) => {
    for (const id of payload.ids) {
      await removeBookmark(id)
    }
    return { removed: payload.ids.length }
  },

  GET_FOLDER_SUGGESTIONS: async () => {
    const config = await getLLMConfig()
    const tree = await getBookmarkTree()
    const folders = getAllFolders(tree)

    // Find folders with generic names
    const genericFolders = folders.filter(f => isGenericFolderName(f.title))

    if (!config || genericFolders.length === 0) {
      return []
    }

    const provider = new OpenAICompatibleProvider(config)
    const suggestions = []

    for (const folder of genericFolders.slice(0, 10)) {
      const children = await getBookmarkChildren(folder.id)
      const bookmarksWithUrls = children.filter(c => c.url)

      if (bookmarksWithUrls.length === 0) continue

      const result = await suggestFolderName(provider, folder.title, bookmarksWithUrls)
      if (result) {
        suggestions.push({
          folder,
          suggestedName: result.name,
          confidence: 0.8,
        })
      }
    }

    return suggestions
  },

  CHECK_DEAD_LINKS: async () => {
    const tree = await getBookmarkTree()
    const bookmarks = getAllBookmarkUrls(tree)
    const deadLinks = []

    for (const bookmark of bookmarks.slice(0, 50)) {
      if (!bookmark.url) continue
      try {
        await fetch(bookmark.url, {
          method: 'HEAD',
          mode: 'no-cors',
        })
        // no-cors mode always returns opaque response, so we check for network errors
      } catch {
        deadLinks.push(bookmark)
      }
    }

    return deadLinks
  },

  FIND_ORPHAN_BOOKMARKS: async () => {
    const tree = await getBookmarkTree()
    return findOrphanBookmarks(tree)
  },

  FIND_LARGE_FOLDERS: async (payload?: { threshold?: number }) => {
    const tree = await getBookmarkTree()
    const threshold = payload?.threshold ?? 100
    return findLargeFolders(tree, threshold)
  },

  CATEGORIZE_TABS: async (payload: {
    windowId?: number
    onProgress?: (progress: OperationProgress) => void
  }) => {
    const config = await getLLMConfig()
    if (!config) {
      throw new Error('LLM not configured')
    }

    const provider = new OpenAICompatibleProvider(config)
    const tabs = payload.windowId
      ? await getTabsInWindow(payload.windowId)
      : await getAllTabs()

    return categorizeTabs(provider, tabs, {
      onProgress: payload.onProgress,
    })
  },

  // ============================================
  // SMART AI CATEGORIZATION HANDLERS
  // ============================================

  /**
   * Smart categorize tabs by topic and subtopic (content-based, not domain)
   */
  SMART_CATEGORIZE_TABS: async (payload: {
    windowId?: number
    windowTopic?: string
    onProgress?: (progress: OperationProgress) => void
  }) => {
    const config = await getLLMConfig()
    if (!config) {
      throw new Error('LLM not configured')
    }

    const provider = new OpenAICompatibleProvider(config)
    const tabs = payload.windowId
      ? await getTabsInWindow(payload.windowId)
      : await getAllTabs()

    return smartCategorizeTabs(provider, tabs, payload.windowTopic, {
      onProgress: payload.onProgress,
    })
  },

  /**
   * Smart assign orphan bookmarks to existing folders based on content/topic
   */
  SMART_ASSIGN_BOOKMARKS: async (payload: {
    bookmarkIds?: string[]
    existingFolders: ExistingFolder[]
    onProgress?: (progress: OperationProgress) => void
  }) => {
    const config = await getLLMConfig()
    if (!config) {
      throw new Error('LLM not configured')
    }

    const provider = new OpenAICompatibleProvider(config)
    const tree = await getBookmarkTree()

    // Get bookmarks to assign - either specified IDs or orphans
    let bookmarks
    if (payload.bookmarkIds && payload.bookmarkIds.length > 0) {
      const allBookmarks = getAllBookmarkUrls(tree)
      bookmarks = allBookmarks.filter((b) => payload.bookmarkIds!.includes(b.id))
    } else {
      bookmarks = findOrphanBookmarks(tree)
    }

    return smartAssignBookmarks(provider, bookmarks, payload.existingFolders, {
      onProgress: payload.onProgress,
    })
  },

  /**
   * Analyze user's existing folder organization pattern
   */
  ANALYZE_USER_FOLDERS: async () => {
    const config = await getLLMConfig()
    if (!config) {
      throw new Error('LLM not configured')
    }

    const provider = new OpenAICompatibleProvider(config)
    const tree = await getBookmarkTree()
    const folders = getAllFolders(tree)

    // Build folder data with sample titles
    const folderData = await Promise.all(
      folders.slice(0, 20).map(async (folder) => {
        const children = await getBookmarkChildren(folder.id)
        const bookmarksWithUrls = children.filter((c) => c.url)
        return {
          name: folder.title,
          itemCount: bookmarksWithUrls.length,
          sampleTitles: bookmarksWithUrls.slice(0, 5).map((b) => b.title),
        }
      })
    )

    return analyzeUserFolders(provider, folderData.filter((f) => f.itemCount > 0))
  },

  /**
   * Suggest how to reorganize a messy folder
   */
  SUGGEST_FOLDER_REORGANIZATION: async (payload: { folderId: string }) => {
    const config = await getLLMConfig()
    if (!config) {
      throw new Error('LLM not configured')
    }

    const provider = new OpenAICompatibleProvider(config)
    const tree = await getBookmarkTree()
    const folders = getAllFolders(tree)

    // Find the target folder
    const folder = folders.find((f) => f.id === payload.folderId)
    if (!folder) {
      throw new Error('Folder not found')
    }

    const children = await getBookmarkChildren(folder.id)
    const bookmarksWithUrls = children.filter((c) => c.url)
    const existingFolderNames = folders
      .filter((f) => f.id !== folder.id)
      .map((f) => f.title)

    return suggestFolderReorganization(
      provider,
      folder.title,
      bookmarksWithUrls,
      existingFolderNames
    )
  },

  /**
   * Generate a smart, specific group name based on tab content
   */
  SUGGEST_SMART_GROUP_NAME: async (payload: { tabIds: number[]; category: string }) => {
    const config = await getLLMConfig()
    if (!config) {
      throw new Error('LLM not configured')
    }

    const provider = new OpenAICompatibleProvider(config)
    const allTabs = await getAllTabs()
    const tabs = allTabs.filter((t) => payload.tabIds.includes(t.id))

    if (tabs.length === 0) {
      return null
    }

    return suggestSmartGroupName(provider, tabs, payload.category)
  },

  GET_LLM_CONFIG: async () => {
    return getLLMConfig()
  },

  TEST_LLM_CONNECTION: async () => {
    const config = await getLLMConfig()
    if (!config) {
      return { success: false, error: 'Not configured' }
    }

    const provider = new OpenAICompatibleProvider(config)

    try {
      // First try to list models (cheaper test)
      const models = await provider.listModels()
      if (models.length > 0) {
        return { success: true, models }
      }

      // If no models returned, try a simple completion test
      const success = await provider.testConnection()
      if (success) {
        return { success: true }
      }

      return { success: false, error: 'Could not connect to API' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed'
      logger.error('LLM connection test failed', { error: message })
      return { success: false, error: message }
    }
  },

  GET_AVAILABLE_MODELS: async () => {
    const config = await getLLMConfig()
    if (!config) {
      return { success: false, models: [], error: 'Not configured' }
    }

    const provider = new OpenAICompatibleProvider(config)

    try {
      const models = await provider.listModels()
      logger.debug(`GET_AVAILABLE_MODELS returned ${models.length} models`)
      return { success: true, models }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch models'
      logger.error('Failed to fetch models', { error: message })
      return { success: false, models: [], error: message }
    }
  },
}

export function setupMessageHandler(): void {
  chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
    handleMessage(message)
      .then((response) => sendResponse(response))
      .catch((error) => {
        logger.error('Message handler error', { message, error })
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      })

    // Return true to indicate async response
    return true
  })
}

async function handleMessage(message: Message): Promise<MessageResponse> {
  const handler = handlers[message.type]

  if (!handler) {
    return { success: false, error: `Unknown message type: ${message.type}` }
  }

  try {
    const data = await handler(message.payload)
    return { success: true, data }
  } catch (error) {
    throw error
  }
}

// Helper to send messages from UI
export function sendMessage<T = unknown>(
  type: MessageType,
  payload?: unknown
): Promise<MessageResponse<T>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, (response: MessageResponse<T>) => {
      resolve(response)
    })
  })
}
