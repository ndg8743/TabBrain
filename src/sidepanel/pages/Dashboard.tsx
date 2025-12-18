import { useEffect, useState } from 'react'
import { ActionCard } from '../components'
import { useTabs, useDuplicateTabs, useLLMConfig, useWindows } from '../hooks'

export type View = 'dashboard' | 'duplicates' | 'windows' | 'merge' | 'bookmarks' | 'settings'

interface DashboardProps {
  onNavigate: (view: View) => void
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { tabs } = useTabs()
  const { windows } = useWindows()
  const { duplicates, scan } = useDuplicateTabs()
  const { isConfigured } = useLLMConfig()
  const [scanned, setScanned] = useState(false)

  // Auto-scan for duplicates on mount
  useEffect(() => {
    if (!scanned && tabs.length > 0) {
      scan().then(() => setScanned(true))
    }
  }, [tabs.length, scanned, scan])

  const duplicateCount = duplicates.reduce(
    (acc, group) => acc + group.tabs.length - 1,
    0
  )

  return (
    <div className="space-y-3">
      {!isConfigured && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm">
          <p className="font-medium">AI not configured</p>
          <p className="text-yellow-600 dark:text-yellow-300 mt-1">
            Set up your API provider in{' '}
            <button
              onClick={() => onNavigate('settings')}
              className="underline hover:no-underline"
            >
              settings
            </button>
            {' '}to enable AI features.
          </p>
        </div>
      )}

      <ActionCard
        title="Find Duplicates"
        description="Detect and remove duplicate tabs and bookmarks"
        icon={<CopyIcon />}
        badge={duplicateCount > 0 ? duplicateCount : undefined}
        onClick={() => onNavigate('duplicates')}
      />

      <ActionCard
        title="Organize Windows"
        description="Label windows by topic, categorize tabs, create groups"
        icon={<WindowIcon />}
        onClick={() => onNavigate('windows')}
        disabled={!isConfigured}
      />

      <ActionCard
        title="Merge Windows"
        description="Combine windows with overlapping content"
        icon={<MergeIcon />}
        badge={windows.length > 1 ? windows.length : undefined}
        onClick={() => onNavigate('merge')}
      />

      <ActionCard
        title="Clean Bookmarks"
        description="Organize and rename bookmark folders"
        icon={<BookmarkIcon />}
        onClick={() => onNavigate('bookmarks')}
      />

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 text-center">
          {tabs.length} tabs in {windows.length} windows
        </p>
      </div>
    </div>
  )
}

// Icons
function CopyIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

function WindowIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  )
}

function MergeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  )
}

function BookmarkIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  )
}
