import { useState, useEffect, useCallback } from 'react'
import type { LLMConfig, OperationProgress, TabInfo } from '@/types/domain'
import { sendMessage } from '@/background/message-handler'

interface CategorizedTab {
  tab: TabInfo
  category: string
}

export function useLLMConfig() {
  const [config, setConfig] = useState<LLMConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await sendMessage<LLMConfig | undefined>('GET_LLM_CONFIG')
      if (response.success) {
        setConfig(response.data ?? null)
      } else {
        setError(response.error ?? 'Failed to get config')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const testConnection = useCallback(async () => {
    const response = await sendMessage<{ success: boolean; error?: string }>('TEST_LLM_CONNECTION')
    return response.success && response.data?.success
  }, [])

  return { config, loading, error, refresh, testConnection, isConfigured: config !== null }
}

export function useCategorizeTabs() {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<OperationProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<CategorizedTab[]>([])

  const categorize = useCallback(async (windowId?: number) => {
    setLoading(true)
    setProgress({ current: 0, total: 1, status: 'Starting...' })
    setError(null)
    setResults([])

    try {
      const response = await sendMessage<CategorizedTab[]>('CATEGORIZE_TABS', {
        windowId,
        // Note: progress callback won't work through message passing
        // Would need to use a different mechanism for real-time progress
      })

      if (response.success && response.data) {
        setResults(response.data)
      } else {
        setError(response.error ?? 'Failed to categorize tabs')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }

    setLoading(false)
    setProgress(null)
  }, [])

  return { categorize, loading, progress, error, results }
}

export function useWindowTopic() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const detectTopic = useCallback(async (windowId: number) => {
    setLoading(true)
    setError(null)

    try {
      const response = await sendMessage<{ topic: string; confidence: number } | null>(
        'DETECT_WINDOW_TOPIC',
        { windowId }
      )

      if (response.success) {
        return response.data
      } else {
        setError(response.error ?? 'Failed to detect topic')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { detectTopic, loading, error }
}
