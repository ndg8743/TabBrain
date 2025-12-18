import { useState, useEffect } from 'react'
import { ErrorBoundary } from './components'
import {
  Dashboard,
  DuplicateFinder,
  WindowOrganizer,
  WindowMerge,
  BookmarkCleaner,
  Settings,
  type View,
} from './pages'

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [hasTabsPermission, setHasTabsPermission] = useState(false)

  useEffect(() => {
    chrome.permissions.contains({ permissions: ['tabs'] }, (result) => {
      setHasTabsPermission(result)
    })
  }, [])

  const requestPermissions = async () => {
    const granted = await chrome.permissions.request({
      permissions: ['tabs', 'bookmarks'],
    })
    setHasTabsPermission(granted)
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen">
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setView('dashboard')}
            className="text-lg font-semibold text-primary-600 hover:text-primary-700"
          >
            TabBrain
          </button>
          <button
            onClick={() => setView('settings')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Settings"
          >
            <SettingsIcon />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          <ErrorBoundary>
            {!hasTabsPermission ? (
              <PermissionRequest onRequest={requestPermissions} />
            ) : (
              <ViewRenderer view={view} onNavigate={setView} />
            )}
          </ErrorBoundary>
        </main>
      </div>
    </ErrorBoundary>
  )
}

function ViewRenderer({
  view,
  onNavigate,
}: {
  view: View
  onNavigate: (view: View) => void
}) {
  switch (view) {
    case 'dashboard':
      return <Dashboard onNavigate={onNavigate} />
    case 'duplicates':
      return <DuplicateFinder onBack={() => onNavigate('dashboard')} />
    case 'windows':
      return <WindowOrganizer onBack={() => onNavigate('dashboard')} />
    case 'merge':
      return <WindowMerge onBack={() => onNavigate('dashboard')} />
    case 'bookmarks':
      return <BookmarkCleaner onBack={() => onNavigate('dashboard')} />
    case 'settings':
      return <Settings onBack={() => onNavigate('dashboard')} />
    default:
      return <Dashboard onNavigate={onNavigate} />
  }
}

function PermissionRequest({ onRequest }: { onRequest: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
        <LockIcon />
      </div>
      <h2 className="text-lg font-medium mb-2">Permissions Required</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
        TabBrain needs access to your tabs and bookmarks to help organize them.
      </p>
      <button
        onClick={onRequest}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        Grant Permissions
      </button>
    </div>
  )
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}
