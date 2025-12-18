import { useState } from 'react'
import type { TabInfo } from '@/types/domain'

interface TabListProps {
  tabs: TabInfo[]
  selectable?: boolean
  selectedIds?: Set<number>
  onSelectionChange?: (ids: Set<number>) => void
  showWindow?: boolean
  showCategory?: boolean
  categories?: Map<number, string>
}

export function TabList({
  tabs,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  showWindow = false,
  showCategory = false,
  categories,
}: TabListProps) {
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
      <div className="text-center py-8 text-gray-500">
        No tabs found
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {selectable && tabs.length > 1 && (
        <div className="flex items-center gap-2 pb-2 mb-2 border-b border-gray-200 dark:border-gray-700">
          <input
            type="checkbox"
            checked={selectedIds.size === tabs.length}
            onChange={toggleAll}
            className="rounded"
          />
          <span className="text-sm text-gray-500">
            {selectedIds.size === 0
              ? 'Select all'
              : `${selectedIds.size} selected`}
          </span>
        </div>
      )}

      {tabs.map((tab) => (
        <TabItem
          key={tab.id}
          tab={tab}
          selectable={selectable}
          selected={selectedIds.has(tab.id)}
          onToggle={() => toggleSelection(tab.id)}
          showWindow={showWindow}
          category={showCategory ? categories?.get(tab.id) : undefined}
        />
      ))}
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
}

function TabItem({
  tab,
  selectable,
  selected,
  onToggle,
  showWindow,
  category,
}: TabItemProps) {
  const [imgError, setImgError] = useState(false)

  const domain = getDomain(tab.url)

  return (
    <div
      className={`
        flex items-center gap-2 p-2 rounded-lg transition-colors
        ${selected ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
      `}
    >
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="rounded flex-shrink-0"
        />
      )}

      <div className="w-4 h-4 flex-shrink-0">
        {tab.favIconUrl && !imgError ? (
          <img
            src={tab.favIconUrl}
            alt=""
            className="w-4 h-4"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{tab.title}</div>
        <div className="text-xs text-gray-500 truncate">{domain}</div>
      </div>

      {showWindow && (
        <span className="text-xs text-gray-400 flex-shrink-0">
          W{tab.windowId}
        </span>
      )}

      {category && (
        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full flex-shrink-0">
          {category}
        </span>
      )}

      {tab.pinned && (
        <PinIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
      )}
    </div>
  )
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 011.342.447 1 1 0 01-.447 1.342l-1.599.8.659 3.293A1 1 0 0115.512 12H13v5a1 1 0 01-2 0v-5H8.488a1 1 0 01-.996-1.013l.659-3.293-1.599-.8a1 1 0 01-.447-1.342 1 1 0 011.342-.447l1.599.8L13 4.323V3a1 1 0 011-1z" />
    </svg>
  )
}
