import { useState, useEffect, useCallback } from 'react'
import type { TabInfo, WindowInfo, DuplicateGroup } from '@/types/domain'
import { sendMessage } from '@/background/message-handler'

export function useTabs() {
  const [tabs, setTabs] = useState<TabInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await sendMessage<TabInfo[]>('GET_ALL_TABS')
      if (response.success && response.data) {
        setTabs(response.data)
      } else {
        setError(response.error ?? 'Failed to get tabs')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { tabs, loading, error, refresh }
}

export function useWindows() {
  const [windows, setWindows] = useState<WindowInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await sendMessage<WindowInfo[]>('GET_ALL_WINDOWS')
      if (response.success && response.data) {
        setWindows(response.data)
      } else {
        setError(response.error ?? 'Failed to get windows')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { windows, loading, error, refresh }
}

export function useDuplicateTabs() {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scan = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await sendMessage<DuplicateGroup[]>('FIND_DUPLICATE_TABS')
      if (response.success && response.data) {
        setDuplicates(response.data)
      } else {
        setError(response.error ?? 'Failed to find duplicates')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
    setLoading(false)
  }, [])

  const closeDuplicates = useCallback(async (tabIds: number[]) => {
    const response = await sendMessage('CLOSE_TABS', { tabIds })
    if (response.success) {
      // Refresh duplicates list
      await scan()
    }
    return response
  }, [scan])

  return { duplicates, loading, error, scan, closeDuplicates }
}

export function useTabGroups() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createGroups = useCallback(async (
    categorizedTabs: Array<{ tab: TabInfo; category: string }>,
    windowId: number
  ) => {
    setLoading(true)
    setError(null)
    try {
      const response = await sendMessage('CREATE_TAB_GROUPS', {
        categorizedTabs,
        windowId,
      })
      if (!response.success) {
        setError(response.error ?? 'Failed to create groups')
      }
      return response
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return { success: false, error: String(err) }
    } finally {
      setLoading(false)
    }
  }, [])

  const sortByDomain = useCallback(async (windowId: number) => {
    setLoading(true)
    setError(null)
    try {
      const response = await sendMessage('SORT_TABS_BY_DOMAIN', { windowId })
      if (!response.success) {
        setError(response.error ?? 'Failed to sort tabs')
      }
      return response
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return { success: false, error: String(err) }
    } finally {
      setLoading(false)
    }
  }, [])

  return { createGroups, sortByDomain, loading, error }
}
