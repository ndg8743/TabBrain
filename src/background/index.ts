// TabBrain Service Worker
import { setupMessageHandler } from './message-handler'
import { logger } from '@/lib/utils/logger'

// Open side panel on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

// Setup message handling
setupMessageHandler()

// Log installation
chrome.runtime.onInstalled.addListener((details) => {
  logger.info('TabBrain installed', { reason: details.reason })
})

// Handle action click
chrome.action.onClicked.addListener((tab) => {
  if (tab.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId })
  }
})

// Handle window close - cleanup topics
chrome.windows.onRemoved.addListener((windowId) => {
  chrome.storage.local.get(['windowTopics'], (result) => {
    if (result.windowTopics?.[windowId]) {
      delete result.windowTopics[windowId]
      chrome.storage.local.set({ windowTopics: result.windowTopics })
    }
  })
})

export {}
