import { useState, useCallback } from 'react'
import { motion } from 'motion/react'
import {
  ChatInterface,
  TabContextSelector,
  type ChatMessage,
  type ContextMode,
} from '../components'
import { useTabs, useWindows, useLLMConfig } from '../hooks'
import type { TabInfo } from '@/types/domain'

interface TabChatProps {
  onBack: () => void
}

export function TabChat({ onBack }: TabChatProps) {
  const { tabs } = useTabs()
  const { windows } = useWindows()
  const { isConfigured } = useLLMConfig()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [contextValue, setContextValue] = useState<{
    mode: ContextMode
    selectedTabs: TabInfo[]
  }>({ mode: 'all', selectedTabs: [] })

  // Get current window ID
  const currentWindowId = windows.find((w) => w.focused)?.id

  // Get tabs based on context mode
  const getContextTabs = useCallback((): TabInfo[] => {
    switch (contextValue.mode) {
      case 'all':
        return tabs
      case 'current-window':
        return tabs.filter((t) => t.windowId === currentWindowId)
      case 'selected':
        return contextValue.selectedTabs
    }
  }, [contextValue, tabs, currentWindowId])

  const handleSend = async (userMessage: string) => {
    const contextTabs = getContextTabs()
    if (contextTabs.length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'No tabs selected. Please select some tabs to chat about.',
          timestamp: new Date(),
        },
      ])
      return
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      // Build conversation history (excluding the new user message)
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      // Send to background
      const response = await chrome.runtime.sendMessage({
        type: 'CHAT_WITH_TABS',
        payload: {
          message: userMessage,
          tabs: contextTabs.map((t) => ({
            id: t.id,
            title: t.title,
            url: t.url,
          })),
          conversationHistory,
        },
      })

      if (response?.success && response.data?.content) {
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.data.content,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMsg])
      } else {
        throw new Error(response?.error || 'Failed to get response')
      }
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([])
  }

  if (!isConfigured) {
    return (
      <div className="space-y-4">
        <Header onBack={onBack} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="empty-state"
        >
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <SparklesIcon className="w-8 h-8 text-amber-400" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-xl" />
          </div>
          <h3 className="empty-state-title">AI Not Configured</h3>
          <p className="empty-state-description mb-6">
            Configure your API provider in settings to chat with your tabs.
          </p>
          <button
            onClick={() => chrome.runtime.openOptionsPage()}
            className="btn-primary"
          >
            <span className="flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              Open Settings
            </span>
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header onBack={onBack} onClear={messages.length > 0 ? handleClearChat : undefined} />

      {/* Context Selector */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <TabContextSelector
          windows={windows}
          currentWindowId={currentWindowId}
          value={contextValue}
          onChange={setContextValue}
        />
      </motion.div>

      {/* Chat Interface */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 min-h-0"
      >
        <ChatInterface
          messages={messages}
          onSend={handleSend}
          isLoading={isLoading}
          placeholder={`Ask about ${getContextTabs().length} tabs...`}
          className="h-full"
        />
      </motion.div>
    </div>
  )
}

function Header({
  onBack,
  onClear,
}: {
  onBack: () => void
  onClear?: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between mb-4"
    >
      <div className="flex items-center gap-3">
        <motion.button
          onClick={onBack}
          whileHover={{ scale: 1.05, x: -2 }}
          whileTap={{ scale: 0.95 }}
          className="btn-icon"
        >
          <BackIcon />
        </motion.button>
        <div>
          <h2 className="font-display font-semibold text-lg text-white">
            Chat with Tabs
          </h2>
          <p className="text-sm text-surface-500">Ask questions about your tabs</p>
        </div>
      </div>
      {onClear && (
        <button
          onClick={onClear}
          className="text-xs text-surface-500 hover:text-surface-300 transition-colors"
        >
          Clear chat
        </button>
      )}
    </motion.div>
  )
}

// Icons
function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 19l-7-7 7-7"
      />
    </svg>
  )
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  )
}
