import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TabInfo } from '@/types/domain'

interface DraggableTabItemProps {
  tab: TabInfo
  isDragging?: boolean
}

export function DraggableTabItem({ tab, isDragging }: DraggableTabItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: `tab-${tab.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging || isDragging ? 0.5 : 1,
  }

  const domain = getDomain(tab.url)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        flex items-center gap-2 p-2 rounded-lg cursor-grab active:cursor-grabbing
        bg-surface-800/50 hover:bg-surface-700/50 transition-colors
        border border-transparent hover:border-surface-600
        ${isSortableDragging ? 'ring-2 ring-brand-500 shadow-lg' : ''}
      `}
    >
      {/* Favicon */}
      {tab.favIconUrl ? (
        <img
          src={tab.favIconUrl}
          alt=""
          className="w-4 h-4 rounded flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      ) : (
        <div className="w-4 h-4 rounded bg-surface-600 flex items-center justify-center flex-shrink-0">
          <GlobeIcon className="w-3 h-3 text-surface-400" />
        </div>
      )}

      {/* Title and domain */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white truncate">{tab.title || 'Untitled'}</p>
        <p className="text-[10px] text-surface-500 truncate">{domain}</p>
      </div>

      {/* Drag handle indicator */}
      <GripIcon className="w-3 h-3 text-surface-600 flex-shrink-0" />
    </div>
  )
}

// Static version for drag overlay
export function TabItemOverlay({ tab }: { tab: TabInfo }) {
  const domain = getDomain(tab.url)

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-800 border border-brand-500 shadow-xl">
      {tab.favIconUrl ? (
        <img src={tab.favIconUrl} alt="" className="w-4 h-4 rounded flex-shrink-0" />
      ) : (
        <div className="w-4 h-4 rounded bg-surface-600 flex items-center justify-center flex-shrink-0">
          <GlobeIcon className="w-3 h-3 text-surface-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white truncate">{tab.title || 'Untitled'}</p>
        <p className="text-[10px] text-surface-500 truncate">{domain}</p>
      </div>
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

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  )
}

function GripIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  )
}
