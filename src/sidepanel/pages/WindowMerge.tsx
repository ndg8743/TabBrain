import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useWindows } from '../hooks'
import { DraggableWindowCard, TabItemOverlay, useToast } from '../components'
import type { TabInfo, WindowInfo } from '@/types/domain'

interface WindowMergeProps {
  onBack: () => void
}

export function WindowMerge({ onBack }: WindowMergeProps) {
  const { windows, loading, refresh: refreshWindows } = useWindows()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<TabInfo | null>(null)
  const [overWindowId, setOverWindowId] = useState<number | null>(null)
  const [localWindows, setLocalWindows] = useState<WindowInfo[]>([])

  // Initialize local windows state from actual windows
  useState(() => {
    if (windows.length > 0 && localWindows.length === 0) {
      setLocalWindows(windows)
    }
  })

  // Update local windows when actual windows change
  if (windows.length > 0 && localWindows.length === 0) {
    setLocalWindows(windows)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const tabId = String(active.id).replace('tab-', '')

    // Find the tab across all windows
    for (const window of localWindows) {
      const tab = window.tabs.find((t) => t.id === parseInt(tabId))
      if (tab) {
        setActiveTab(tab)
        break
      }
    }
  }, [localWindows])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    if (over) {
      const windowId = String(over.id).replace('window-', '')
      setOverWindowId(parseInt(windowId))
    } else {
      setOverWindowId(null)
    }
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTab(null)
    setOverWindowId(null)

    if (!over || !active) return

    const tabId = parseInt(String(active.id).replace('tab-', ''))
    const targetWindowId = parseInt(String(over.id).replace('window-', ''))

    // Find source window and tab
    let sourceWindowId: number | null = null
    let tab: TabInfo | null = null

    for (const window of localWindows) {
      const foundTab = window.tabs.find((t) => t.id === tabId)
      if (foundTab) {
        sourceWindowId = window.id
        tab = foundTab
        break
      }
    }

    if (!tab || sourceWindowId === null || sourceWindowId === targetWindowId) return

    try {
      // Move the tab using Chrome API
      await chrome.tabs.move(tabId, { windowId: targetWindowId, index: -1 })

      // Update local state
      setLocalWindows((prev) =>
        prev.map((w) => {
          if (w.id === sourceWindowId) {
            return { ...w, tabs: w.tabs.filter((t) => t.id !== tabId) }
          }
          if (w.id === targetWindowId) {
            return { ...w, tabs: [...w.tabs, { ...tab!, windowId: targetWindowId }] }
          }
          return w
        })
      )

      toast.success('Tab moved', `Moved to window ${targetWindowId}`)
    } catch (error) {
      toast.error('Move failed', String(error))
      // Refresh to get actual state
      refreshWindows()
    }
  }, [localWindows, toast, refreshWindows])

  const handleMergeAll = async (sourceWindowId: number, targetWindowId: number) => {
    const sourceWindow = localWindows.find((w) => w.id === sourceWindowId)
    if (!sourceWindow || sourceWindow.tabs.length === 0) return

    try {
      // Move all tabs
      const tabIds = sourceWindow.tabs.map((t) => t.id)
      await chrome.tabs.move(tabIds, { windowId: targetWindowId, index: -1 })

      // Update local state
      setLocalWindows((prev) => {
        const targetWindow = prev.find((w) => w.id === targetWindowId)
        if (!targetWindow) return prev

        return prev.map((w) => {
          if (w.id === sourceWindowId) {
            return { ...w, tabs: [] }
          }
          if (w.id === targetWindowId) {
            return {
              ...w,
              tabs: [
                ...w.tabs,
                ...sourceWindow.tabs.map((t) => ({ ...t, windowId: targetWindowId })),
              ],
            }
          }
          return w
        })
      })

      toast.success('Windows merged', `Moved ${tabIds.length} tabs`)
    } catch (error) {
      toast.error('Merge failed', String(error))
      refreshWindows()
    }
  }

  const handleCloseEmptyWindow = async (windowId: number) => {
    try {
      await chrome.windows.remove(windowId)
      setLocalWindows((prev) => prev.filter((w) => w.id !== windowId))
      toast.success('Window closed')
    } catch (error) {
      toast.error('Close failed', String(error))
    }
  }

  if (loading && localWindows.length === 0) {
    return (
      <div className="space-y-4">
        <Header onBack={onBack} />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="skeleton h-48 rounded-2xl"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Header onBack={onBack} />

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-brand-500/20">
            <DragIcon className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h3 className="font-medium text-white text-sm">Drag & Drop to Merge</h3>
            <p className="text-xs text-surface-400 mt-1">
              Drag tabs between windows to reorganize. Use "Merge All" to move all tabs at once.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="flex items-center gap-2">
        <span className="badge-info">
          <WindowIcon className="w-3.5 h-3.5" />
          {localWindows.length} window{localWindows.length !== 1 ? 's' : ''}
        </span>
        <span className="badge-neutral">
          {localWindows.reduce((acc, w) => acc + w.tabs.length, 0)} total tabs
        </span>
      </div>

      {/* Windows Grid with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {localWindows.map((window, index) => (
              <motion.div
                key={window.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <DraggableWindowCard
                  window={window}
                  isOver={overWindowId === window.id}
                  onClose={
                    window.tabs.length === 0
                      ? () => handleCloseEmptyWindow(window.id)
                      : undefined
                  }
                />

                {/* Merge buttons */}
                {window.tabs.length > 0 && localWindows.length > 1 && (
                  <div className="mt-2 flex gap-2">
                    {localWindows
                      .filter((w) => w.id !== window.id)
                      .slice(0, 2)
                      .map((targetWindow) => (
                        <button
                          key={targetWindow.id}
                          onClick={() => handleMergeAll(window.id, targetWindow.id)}
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white transition-colors flex items-center justify-center gap-1.5"
                        >
                          <MergeIcon className="w-3.5 h-3.5" />
                          Merge to Window {targetWindow.id}
                        </button>
                      ))}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTab && <TabItemOverlay tab={activeTab} />}
        </DragOverlay>
      </DndContext>

      {localWindows.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="empty-state"
        >
          <WindowIcon className="empty-state-icon" />
          <h3 className="empty-state-title">No Windows</h3>
          <p className="empty-state-description">
            Open some browser windows to start merging.
          </p>
        </motion.div>
      )}
    </div>
  )
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3"
    >
      <motion.button
        onClick={onBack}
        whileHover={{ scale: 1.05, x: -2 }}
        whileTap={{ scale: 0.95 }}
        className="btn-icon"
      >
        <BackIcon />
      </motion.button>
      <div>
        <h2 className="font-display font-semibold text-lg text-white">Merge Windows</h2>
        <p className="text-sm text-surface-500">Drag tabs to reorganize</p>
      </div>
    </motion.div>
  )
}

// Icons
function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function WindowIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-5 h-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  )
}

function DragIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  )
}

function MergeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  )
}
