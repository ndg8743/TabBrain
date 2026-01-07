import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion } from 'motion/react'
import type { WindowInfo } from '@/types/domain'
import { DraggableTabItem } from './DraggableTabItem'

interface DraggableWindowCardProps {
  window: WindowInfo
  isOver?: boolean
  onClose?: () => void
}

export function DraggableWindowCard({ window, isOver, onClose }: DraggableWindowCardProps) {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: `window-${window.id}`,
  })

  const isActive = isOver || isDroppableOver
  const domains = [...new Set(window.tabs.map((t) => getDomain(t.url)))].slice(0, 3)

  return (
    <motion.div
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        glass-card p-4 transition-all duration-200
        ${isActive ? 'ring-2 ring-brand-500 bg-brand-500/10' : ''}
      `}
    >
      {/* Window Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <WindowIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-white text-sm">
              {window.topic || `Window ${window.id}`}
            </h3>
            <p className="text-[10px] text-surface-500">
              {window.tabs.length} tab{window.tabs.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {window.focused && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-brand-500/20 text-brand-400">
              Current
            </span>
          )}
          {onClose && window.tabs.length === 0 && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-red-500/20 text-surface-500 hover:text-red-400 transition-colors"
              title="Close empty window"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Domain tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {domains.map((domain) => (
          <span
            key={domain}
            className="px-1.5 py-0.5 text-[10px] rounded bg-surface-800 text-surface-400"
          >
            {domain}
          </span>
        ))}
        {window.tabs.length > domains.length && (
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-surface-800 text-surface-500">
            +{window.tabs.length - domains.length}
          </span>
        )}
      </div>

      {/* Drop zone indicator */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-2 p-2 rounded-lg border-2 border-dashed border-brand-500/50 bg-brand-500/10 text-center"
        >
          <p className="text-xs text-brand-400">Drop tabs here</p>
        </motion.div>
      )}

      {/* Tabs list */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
        <SortableContext
          items={window.tabs.map((t) => `tab-${t.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {window.tabs.map((tab) => (
            <DraggableTabItem key={tab.id} tab={tab} />
          ))}
        </SortableContext>

        {window.tabs.length === 0 && (
          <div className="py-4 text-center">
            <p className="text-xs text-surface-500">No tabs</p>
            <p className="text-[10px] text-surface-600">Drop tabs here or close window</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function WindowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
