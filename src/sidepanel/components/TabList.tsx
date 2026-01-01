import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { TabInfo } from '@/types/domain'
import { usePerformanceContext } from '../context'

interface TabListProps {
  tabs: TabInfo[]
  selectable?: boolean
  selectedIds?: Set<number>
  onSelectionChange?: (ids: Set<number>) => void
  showWindow?: boolean
  showCategory?: boolean
  categories?: Map<number, string>
  subtopics?: Map<number, string | undefined>
  enableSwitchOnDoubleClick?: boolean
}

// Large tab lists also benefit from reduced animations regardless of FPS
const LARGE_LIST_THRESHOLD = 100

const categoryColors: Record<string, string> = {
  Technology: 'bg-blue-500/20 text-blue-400 ring-blue-500/30',
  Shopping: 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30',
  News: 'bg-red-500/20 text-red-400 ring-red-500/30',
  Entertainment: 'bg-purple-500/20 text-purple-400 ring-purple-500/30',
  Social: 'bg-pink-500/20 text-pink-400 ring-pink-500/30',
  Finance: 'bg-green-500/20 text-green-400 ring-green-500/30',
  Reference: 'bg-yellow-500/20 text-yellow-400 ring-yellow-500/30',
  Productivity: 'bg-indigo-500/20 text-indigo-400 ring-indigo-500/30',
  Other: 'bg-surface-700 text-surface-400 ring-surface-600',
}

export function TabList({
  tabs,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  showWindow = false,
  showCategory = false,
  categories,
  subtopics,
  enableSwitchOnDoubleClick = true,
}: TabListProps) {
  // Use FPS-based performance detection from context, or enable for very large lists
  const { performanceMode: fpsPerformanceMode } = usePerformanceContext()
  const performanceMode = fpsPerformanceMode || tabs.length > LARGE_LIST_THRESHOLD

  const toggleSelection = (id: number) => {
    if (!onSelectionChange) return

    const newSelection = new Set(selectedIds)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    onSelectionChange(newSelection)
  }

  const toggleAll = () => {
    if (!onSelectionChange) return

    if (selectedIds.size === tabs.length) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(tabs.map((t) => t.id)))
    }
  }

  if (tabs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="empty-state py-8"
      >
        <TabsIcon className="empty-state-icon" />
        <p className="empty-state-title">No tabs found</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-1">
      {selectable && tabs.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3 glass-card mb-2"
        >
          <button
            onClick={toggleAll}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
              selectedIds.size === tabs.length
                ? 'bg-brand-500 border-brand-500'
                : selectedIds.size > 0
                ? 'border-brand-500/50 bg-brand-500/20'
                : 'border-surface-600 bg-transparent'
            }`}
          >
            {selectedIds.size === tabs.length && (
              <CheckIcon className="w-3 h-3 text-white" />
            )}
            {selectedIds.size > 0 && selectedIds.size < tabs.length && (
              <MinusIcon className="w-3 h-3 text-brand-400" />
            )}
          </button>
          <span className="text-sm text-surface-400">
            {selectedIds.size === 0
              ? `Select all (${tabs.length})`
              : `${selectedIds.size} of ${tabs.length} selected`}
          </span>
        </motion.div>
      )}

      <div className="space-y-1">
        {performanceMode ? (
          // Performance mode: minimal animations for large lists
          tabs.map((tab) => (
            <div key={tab.id}>
              <TabItem
                tab={tab}
                selectable={selectable}
                selected={selectedIds.has(tab.id)}
                onToggle={() => toggleSelection(tab.id)}
                showWindow={showWindow}
                category={showCategory ? categories?.get(tab.id) : undefined}
                subtopic={subtopics?.get(tab.id)}
                enableSwitchOnDoubleClick={enableSwitchOnDoubleClick}
                performanceMode={performanceMode}
              />
            </div>
          ))
        ) : (
          // Normal mode: full animations for smaller lists
          <AnimatePresence mode="popLayout">
            {tabs.map((tab, index) => (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10, height: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                <TabItem
                  tab={tab}
                  selectable={selectable}
                  selected={selectedIds.has(tab.id)}
                  onToggle={() => toggleSelection(tab.id)}
                  showWindow={showWindow}
                  category={showCategory ? categories?.get(tab.id) : undefined}
                  subtopic={subtopics?.get(tab.id)}
                  enableSwitchOnDoubleClick={enableSwitchOnDoubleClick}
                  performanceMode={false}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

interface TabItemProps {
  tab: TabInfo
  selectable: boolean
  selected: boolean
  onToggle: () => void
  showWindow: boolean
  category?: string
  subtopic?: string
  enableSwitchOnDoubleClick: boolean
  performanceMode: boolean
}

function TabItem({
  tab,
  selectable,
  selected,
  onToggle,
  showWindow,
  category,
  subtopic,
  enableSwitchOnDoubleClick,
  performanceMode,
}: TabItemProps) {
  const [imgError, setImgError] = useState(false)
  const domain = getDomain(tab.url)

  const handleDoubleClick = async () => {
    if (!enableSwitchOnDoubleClick) return
    try {
      // Activate the tab
      await chrome.tabs.update(tab.id, { active: true })
      // Focus the window containing the tab
      await chrome.windows.update(tab.windowId, { focused: true })
    } catch (err) {
      console.error('Failed to switch to tab:', err)
    }
  }

  const baseClasses = `
    flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer
    ${selected
      ? 'bg-brand-500/10 ring-1 ring-brand-500/30'
      : 'bg-surface-900/50 hover:bg-surface-800/70'
    }
  `

  // Performance mode: use a simple div without motion animations
  if (performanceMode) {
    return (
      <div
        onClick={selectable ? onToggle : undefined}
        onDoubleClick={handleDoubleClick}
        title={enableSwitchOnDoubleClick ? 'Double-click to switch to this tab' : undefined}
        className={baseClasses}
      >
        {renderTabContent()}
      </div>
    )
  }

  // Normal mode: full motion animations
  return (
    <motion.div
      whileHover={{ scale: 1.01, x: 2 }}
      whileTap={{ scale: 0.99 }}
      onClick={selectable ? onToggle : undefined}
      onDoubleClick={handleDoubleClick}
      title={enableSwitchOnDoubleClick ? 'Double-click to switch to this tab' : undefined}
      className={baseClasses}
    >
      {renderTabContent()}
    </motion.div>
  )

  function renderTabContent() {
    return (
      <>
      {selectable && (
        <div
          className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
            selected
              ? 'bg-brand-500 border-brand-500'
              : 'border-surface-600 bg-transparent'
          }`}
        >
          {selected && (
            performanceMode ? (
              <CheckIcon className="w-3 h-3 text-white" />
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <CheckIcon className="w-3 h-3 text-white" />
              </motion.div>
            )
          )}
        </div>
      )}

      {/* Favicon */}
      <div className="w-5 h-5 flex-shrink-0 rounded overflow-hidden bg-surface-800">
        {tab.favIconUrl && !imgError ? (
          <img
            src={tab.favIconUrl}
            alt=""
            className="w-5 h-5 object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-5 h-5 flex items-center justify-center">
            <GlobeIcon className="w-3 h-3 text-surface-500" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {tab.title}
        </p>
        <p className="text-xs text-surface-500 truncate">
          {domain}
        </p>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {tab.pinned && (
          <div className="p-1 rounded bg-surface-800" title="Pinned">
            <PinIcon className="w-3 h-3 text-surface-400" />
          </div>
        )}

        {showWindow && (
          <span className="badge-neutral text-[10px]">
            W{tab.windowId}
          </span>
        )}

        {category && (
          <span
            className={`px-2 py-0.5 text-[10px] font-medium rounded-full ring-1 ${
              categoryColors[category] || categoryColors.Other
            }`}
            title={subtopic || category}
          >
            {subtopic || category}
          </span>
        )}
      </div>
      </>
    )
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// Icons
function TabsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  )
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  )
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 011.342.447 1 1 0 01-.447 1.342l-1.599.8.659 3.293A1 1 0 0115.512 12H13v5a1 1 0 01-2 0v-5H8.488a1 1 0 01-.996-1.013l.659-3.293-1.599-.8a1 1 0 01-.447-1.342 1 1 0 011.342-.447l1.599.8L13 4.323V3a1 1 0 011-1z" />
    </svg>
  )
}
