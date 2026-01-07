import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useTabs, useDuplicateTabs, useLLMConfig, useWindows } from '../hooks'
import { CopyTabsButton } from '../components'

export type View = 'dashboard' | 'duplicates' | 'windows' | 'merge' | 'bookmarks' | 'settings' | 'chat' | 'mindmap'

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

  const actions = [
    {
      id: 'chat',
      title: 'Chat with Tabs',
      description: 'Ask questions about your tabs',
      icon: <ChatIcon />,
      view: 'chat' as View,
      disabled: !isConfigured,
      gradient: 'from-brand-500 to-cyan-500',
      shadowColor: 'shadow-brand-500/20',
      aiPowered: true,
    },
    {
      id: 'duplicates',
      title: 'Find Duplicates',
      description: 'Detect and remove duplicate tabs',
      icon: <CopyIcon />,
      badge: duplicateCount > 0 ? duplicateCount : undefined,
      view: 'duplicates' as View,
      gradient: 'from-rose-500 to-pink-600',
      shadowColor: 'shadow-rose-500/20',
    },
    {
      id: 'windows',
      title: 'Organize Windows',
      description: 'AI-powered categorization & groups',
      icon: <WindowIcon />,
      view: 'windows' as View,
      disabled: !isConfigured,
      gradient: 'from-violet-500 to-purple-600',
      shadowColor: 'shadow-violet-500/20',
      aiPowered: true,
    },
    {
      id: 'merge',
      title: 'Merge Windows',
      description: 'Combine overlapping windows',
      icon: <MergeIcon />,
      badge: windows.length > 1 ? windows.length : undefined,
      view: 'merge' as View,
      gradient: 'from-cyan-500 to-blue-600',
      shadowColor: 'shadow-cyan-500/20',
    },
    {
      id: 'bookmarks',
      title: 'Clean Bookmarks',
      description: 'Organize and rename folders',
      icon: <BookmarkIcon />,
      view: 'bookmarks' as View,
      gradient: 'from-emerald-500 to-teal-600',
      shadowColor: 'shadow-emerald-500/20',
    },
    {
      id: 'mindmap',
      title: 'Tab Mindmap',
      description: 'Visualize all tabs & windows',
      icon: <MindmapIcon />,
      view: 'mindmap' as View,
      gradient: 'from-indigo-500 to-violet-600',
      shadowColor: 'shadow-indigo-500/20',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Hero section with stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl glass-card p-5"
      >
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />

        <div className="relative">
          <p className="text-surface-400 text-sm mb-1">Your browser has</p>
          <div className="flex items-baseline gap-3">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold text-white">{tabs.length}</span>
              <span className="text-surface-400 text-sm">tabs</span>
            </div>
            <span className="text-surface-600">in</span>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold text-white">{windows.length}</span>
              <span className="text-surface-400 text-sm">windows</span>
            </div>
          </div>

          {/* Duplicates warning and copy button */}
          <div className="mt-4 flex items-center justify-between">
            {duplicateCount > 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 text-sm"
              >
                <span className="badge-warning">
                  <WarningIcon className="w-3.5 h-3.5" />
                  {duplicateCount} duplicates found
                </span>
              </motion.div>
            ) : (
              <div />
            )}
            <CopyTabsButton
              tabs={tabs}
              label="Copy All Tabs"
              variant="ghost"
              size="sm"
              showCount={false}
            />
          </div>
        </div>
      </motion.div>

      {/* AI Config Warning */}
      {!isConfigured && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <SparklesIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-amber-200">AI features disabled</p>
              <p className="text-sm text-amber-300/70 mt-0.5">
                Configure your API provider in{' '}
                <button
                  onClick={() => onNavigate('settings')}
                  className="underline hover:text-amber-200 transition-colors"
                >
                  settings
                </button>
                {' '}to unlock AI-powered organization.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Actions Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-medium text-surface-500 uppercase tracking-wider px-1">
          Quick Actions
        </h2>
        <div className="grid gap-3">
          {actions.map((action, index) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => onNavigate(action.view)}
              disabled={action.disabled}
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.99 }}
              className={`group relative w-full text-left overflow-hidden rounded-2xl glass-card-hover p-4 ${
                action.disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Icon with gradient */}
                <div className={`relative flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg ${action.shadowColor}`}>
                  <div className="text-white">
                    {action.icon}
                  </div>
                  {/* Glow effect on hover */}
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-300`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold text-white group-hover:text-brand-300 transition-colors">
                      {action.title}
                    </h3>
                    {action.aiPowered && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/30">
                        AI
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-surface-400 mt-0.5 truncate">
                    {action.description}
                  </p>
                </div>

                {/* Badge or Arrow */}
                {action.badge ? (
                  <div className="flex-shrink-0 min-w-[28px] h-7 px-2 rounded-full bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/30 flex items-center justify-center text-sm font-medium">
                    {action.badge}
                  </div>
                ) : (
                  <motion.div
                    className="flex-shrink-0 text-surface-500 group-hover:text-white transition-colors"
                    initial={false}
                    animate={{ x: 0 }}
                    whileHover={{ x: 4 }}
                  >
                    <ArrowRightIcon className="w-5 h-5" />
                  </motion.div>
                )}
              </div>

              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-surface-800/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-center gap-4 pt-4"
      >
        <button
          onClick={() => onNavigate('settings')}
          className="text-xs text-surface-500 hover:text-surface-300 transition-colors"
        >
          Settings
        </button>
        <span className="w-1 h-1 rounded-full bg-surface-700" />
        <span className="text-xs text-surface-600">
          v1.1.0
        </span>
      </motion.div>
    </div>
  )
}

// Icons
function ChatIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

function WindowIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  )
}

function MergeIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  )
}

function BookmarkIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  )
}

function MindmapIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" strokeWidth={2} />
      <circle cx="5" cy="6" r="2" strokeWidth={2} />
      <circle cx="19" cy="6" r="2" strokeWidth={2} />
      <circle cx="5" cy="18" r="2" strokeWidth={2} />
      <circle cx="19" cy="18" r="2" strokeWidth={2} />
      <path strokeLinecap="round" strokeWidth={2} d="M9.5 10L6.5 7.5M14.5 10l3-2.5M9.5 14l-3 2.5M14.5 14l3 2.5" />
    </svg>
  )
}
