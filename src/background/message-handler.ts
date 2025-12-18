import type { TabInfo, OperationProgress } from '@/types/domain'
import { getAllTabs, getTabsInWindow, closeTabs, groupTabs, sortTabsByDomain } from '@/lib/chrome/tabs'
import { getAllWindows, mergeWindows } from '@/lib/chrome/windows'
import { getBookmarkTree, getAllBookmarkUrls, getAllFolders, renameBookmark, removeBookmark, isGenericFolderName, getBookmarkChildren } from '@/lib/chrome/bookmarks'
import { getCategoryColor } from '@/lib/chrome/tab-groups'
import { getLLMConfig } from '@/lib/chrome/storage'
import { findDuplicateTabs, findDuplicateBookmarks } from '@/lib/algorithms/clustering'
import { domainOverlap } from '@/lib/algorithms/similarity'
import { OpenAICompatibleProvider } from '@/lib/llm/openai-compatible'
import { categorizeTabs, detectWindowTopic, suggestFolderName } from '@/lib/llm/batch-processor'
import { logger } from '@/lib/utils/logger'

// Message types
export type MessageType =
  | 'GET_ALL_TABS'
  | 'GET_ALL_WINDOWS'
  | 'FIND_DUPLICATE_TABS'
  | 'CLOSE_TABS'
  | 'SORT_TABS_BY_DOMAIN'
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

  CREATE_TAB_GROUPS: async (payload: {
    categorizedTabs: Array<{ tab: TabInfo; category: string }>
    windowId: number
  }) => {
    const { categorizedTabs, windowId } = payload

    // Group tabs by category
    const byCategory = new Map<string, TabInfo[]>()
    for (const { tab, category } of categorizedTabs) {
      if (tab.windowId !== windowId) continue
      if (tab.pinned) continue

      const existing = byCategory.get(category)
      if (existing) {
        existing.push(tab)
      } else {
        byCategory.set(category, [tab])
      }
    }

    // Create groups for categories with 2+ tabs
    const created: string[] = []
    for (const [category, tabs] of byCategory) {
      if (tabs.length < 2) continue

      await groupTabs(
        tabs.map((t) => t.id),
        { title: category, color: getCategoryColor(category), windowId }
      )
      created.push(category)
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

  FIND_MERGE_SUGGESTIONS: async () => {
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

        if (overlap > 0.5) {
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

  GET_LLM_CONFIG: async () => {
    return getLLMConfig()
  },

  TEST_LLM_CONNECTION: async () => {
    const config = await getLLMConfig()
    if (!config) {
      return { success: false, error: 'Not configured' }
    }

    const provider = new OpenAICompatibleProvider(config)
    const success = await provider.testConnection()
    return { success }
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
