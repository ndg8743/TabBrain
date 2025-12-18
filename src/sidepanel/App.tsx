import { useState, useEffect } from 'react'

type View = 'dashboard' | 'duplicates' | 'windows' | 'bookmarks' | 'settings'

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
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-lg font-semibold text-primary-600">TabBrain</h1>
        <button
          onClick={() => setView('settings')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Settings"
        >
          <SettingsIcon />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {!hasTabsPermission ? (
          <PermissionRequest onRequest={requestPermissions} />
        ) : view === 'dashboard' ? (
          <Dashboard onNavigate={setView} />
        ) : view === 'settings' ? (
          <Settings onBack={() => setView('dashboard')} />
        ) : (
          <div className="text-center py-8 text-gray-500">
            {view} view coming soon
          </div>
        )}
      </main>
    </div>
  )
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

function Dashboard({ onNavigate }: { onNavigate: (view: View) => void }) {
  const actions = [
    {
      id: 'duplicates',
      title: 'Find Duplicates',
      description: 'Detect and remove duplicate tabs and bookmarks',
      icon: <CopyIcon />,
    },
    {
      id: 'windows',
      title: 'Organize Windows',
      description: 'Label windows by topic and merge similar ones',
      icon: <WindowIcon />,
    },
    {
      id: 'bookmarks',
      title: 'Clean Bookmarks',
      description: 'Organize and rename bookmark folders',
      icon: <BookmarkIcon />,
    },
  ] as const

  return (
    <div className="space-y-3">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onNavigate(action.id)}
          className="w-full p-4 text-left bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900 text-primary-600">
              {action.icon}
            </div>
            <div>
              <h3 className="font-medium">{action.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {action.description}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

function Settings({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
      >
        <BackIcon /> Back
      </button>
      <h2 className="text-lg font-medium mb-4">Settings</h2>
      <p className="text-gray-500">
        Configure your AI provider in the extension options page.
      </p>
      <button
        onClick={() => chrome.runtime.openOptionsPage()}
        className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        Open Options
      </button>
    </div>
  )
}

// Icons
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

function BookmarkIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}
