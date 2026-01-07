import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ErrorBoundary, ToastProvider, ProcessingQueue } from './components'
import { PerformanceProvider, ViewModeProvider, QueueProvider } from './context'
import {
  Dashboard,
  DuplicateFinder,
  WindowOrganizer,
  WindowMerge,
  BookmarkCleaner,
  Settings,
  TabChat,
  TabMindmap,
  type View,
} from './pages'

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [hasTabsPermission, setHasTabsPermission] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    chrome.permissions.contains({ permissions: ['tabs'] }, (result) => {
      setHasTabsPermission(result)
      setIsLoading(false)
    })
  }, [])

  const requestPermissions = async () => {
    const granted = await chrome.permissions.request({
      permissions: ['tabs', 'bookmarks'],
    })
    setHasTabsPermission(granted)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 animate-pulse" />
            <div className="absolute inset-0 rounded-2xl bg-brand-500/30 blur-xl animate-glow" />
          </div>
          <span className="text-surface-400 text-sm">Loading...</span>
        </motion.div>
      </div>
    )
  }

  return (
    <PerformanceProvider>
      <ViewModeProvider>
        <QueueProvider>
          <ToastProvider>
            <ErrorBoundary>
              <div className="flex flex-col h-screen overflow-hidden">
          {/* Header */}
          <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex items-center justify-between px-5 py-4"
          >
            {/* Glass effect background */}
            <div className="absolute inset-0 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800/50" />

            {/* Brand */}
            <motion.button
              onClick={() => setView('dashboard')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative flex items-center gap-3 group"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                  <BrainIcon className="w-5 h-5 text-white" />
                </div>
                <div className="absolute inset-0 rounded-xl bg-brand-500/40 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-display font-bold text-lg text-white tracking-tight">
                  Tab<span className="text-gradient">Brain</span>
                </span>
              </div>
            </motion.button>

            {/* Settings button */}
            <motion.button
              onClick={() => setView('settings')}
              whileHover={{ scale: 1.05, rotate: 15 }}
              whileTap={{ scale: 0.95 }}
              className="relative btn-icon"
              title="Settings"
            >
              <SettingsIcon className="w-5 h-5" />
            </motion.button>
          </motion.header>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
            <ErrorBoundary>
              <AnimatePresence mode="wait">
                {!hasTabsPermission ? (
                  <PermissionRequest key="permission" onRequest={requestPermissions} />
                ) : (
                  <ViewRenderer key={view} view={view} onNavigate={setView} />
                )}
              </AnimatePresence>
            </ErrorBoundary>
          </main>

              {/* Processing Queue - fixed at bottom */}
              <ProcessingQueue />
            </div>
          </ErrorBoundary>
        </ToastProvider>
      </QueueProvider>
    </ViewModeProvider>
  </PerformanceProvider>
  )
}

function ViewRenderer({
  view,
  onNavigate,
}: {
  view: View
  onNavigate: (view: View) => void
}) {
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  }

  const content = (() => {
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
      case 'chat':
        return <TabChat onBack={() => onNavigate('dashboard')} />
      case 'mindmap':
        return <TabMindmap onBack={() => onNavigate('dashboard')} />
      default:
        return <Dashboard onNavigate={onNavigate} />
    }
  })()

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="p-5"
    >
      {content}
    </motion.div>
  )
}

function PermissionRequest({ onRequest }: { onRequest: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      {/* Animated icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        className="relative mb-6"
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 flex items-center justify-center">
          <LockIcon className="w-10 h-10 text-white" />
        </div>
        <div className="absolute inset-0 rounded-3xl bg-brand-500/30 blur-xl animate-pulse" />
        <motion.div
          className="absolute -inset-2 rounded-[2rem] border-2 border-brand-500/30"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
        />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="font-display text-2xl font-bold text-white mb-3"
      >
        Permissions Required
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-surface-400 mb-8 max-w-xs leading-relaxed"
      >
        TabBrain needs access to your tabs and bookmarks to help organize them intelligently.
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={onRequest}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="btn-primary text-base px-8 py-3"
      >
        <span className="flex items-center gap-2">
          <ShieldIcon className="w-5 h-5" />
          Grant Permissions
        </span>
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-xs text-surface-500"
      >
        Your data never leaves your browser
      </motion.p>
    </motion.div>
  )
}

// Icons
function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}
