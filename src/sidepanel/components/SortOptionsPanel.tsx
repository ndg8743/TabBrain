import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { sendMessage } from '@/background/message-handler'
import type { SortOptions, SortBy, SortDirection } from '@/types/domain'

interface SortOptionsPanelProps {
  windowId: number
  onSortComplete?: () => void
}

type SortState = 'idle' | 'sorting' | 'success' | 'error'

export function SortOptionsPanel({ windowId, onSortComplete }: SortOptionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>('domain')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [groupSubdomains, setGroupSubdomains] = useState(false)
  const [sortState, setSortState] = useState<SortState>('idle')
  const [showTooltip, setShowTooltip] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Load preferences from storage on mount
  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const result = await chrome.storage.local.get('sortPreferences')
      if (result.sortPreferences) {
        const prefs = result.sortPreferences as Partial<SortOptions>
        if (prefs.sortBy) setSortBy(prefs.sortBy)
        if (prefs.sortDirection) setSortDirection(prefs.sortDirection)
        if (prefs.groupSubdomains !== undefined) setGroupSubdomains(prefs.groupSubdomains)
      }
    } catch (error) {
      console.error('Failed to load sort preferences:', error)
    }
  }

  const savePreferences = async (options: Partial<SortOptions>) => {
    try {
      await chrome.storage.local.set({ sortPreferences: options })
    } catch (error) {
      console.error('Failed to save sort preferences:', error)
    }
  }

  const handleSortByChange = (value: SortBy) => {
    setSortBy(value)
    savePreferences({ sortBy: value, sortDirection, groupSubdomains })
  }

  const handleDirectionChange = (direction: SortDirection) => {
    setSortDirection(direction)
    savePreferences({ sortBy, sortDirection: direction, groupSubdomains })
  }

  const handleSubdomainToggle = () => {
    const newValue = !groupSubdomains
    setGroupSubdomains(newValue)
    savePreferences({ sortBy, sortDirection, groupSubdomains: newValue })
  }

  const scheduleReset = (delay: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => setSortState('idle'), delay)
  }

  const handleSortWindow = async () => {
    setSortState('sorting')
    try {
      const response = await sendMessage('SORT_TABS', {
        windowId,
        options: { sortBy, sortDirection, groupSubdomains },
      })

      if (response.success) {
        setSortState('success')
        scheduleReset(2000)
        onSortComplete?.()
      } else {
        setSortState('error')
        scheduleReset(3000)
      }
    } catch (error) {
      console.error('Sort failed:', error)
      setSortState('error')
      scheduleReset(3000)
    }
  }

  const handleSortAllWindows = async () => {
    setSortState('sorting')
    try {
      const response = await sendMessage('SORT_ALL_TABS', {
        options: { sortBy, sortDirection, groupSubdomains },
      })

      if (response.success) {
        setSortState('success')
        scheduleReset(2000)
        onSortComplete?.()
      } else {
        setSortState('error')
        scheduleReset(3000)
      }
    } catch (error) {
      console.error('Sort all failed:', error)
      setSortState('error')
      scheduleReset(3000)
    }
  }

  const sortByOptions: { value: SortBy; label: string; icon: JSX.Element }[] = [
    { value: 'domain', label: 'Domain', icon: <GlobeIcon className="w-4 h-4" /> },
    { value: 'title', label: 'Title', icon: <TextIcon className="w-4 h-4" /> },
    { value: 'dateOpened', label: 'Date Opened', icon: <ClockIcon className="w-4 h-4" /> },
  ]

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-800/50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <SortIcon className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <span className="font-medium text-white">Sort Options</span>
            <p className="text-xs text-surface-500">
              By {sortBy} • {sortDirection === 'asc' ? 'A-Z' : 'Z-A'}
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronIcon className="w-5 h-5 text-surface-500" />
        </motion.div>
      </motion.button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-5">
              {/* Divider */}
              <div className="divider" />

              {/* Sort By Selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Sort By
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {sortByOptions.map((option) => (
                    <motion.button
                      key={option.value}
                      onClick={() => handleSortByChange(option.value)}
                      disabled={sortState === 'sorting'}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200 ${
                        sortBy === option.value
                          ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/50'
                          : 'bg-surface-800/50 text-surface-400 hover:bg-surface-800 hover:text-surface-200'
                      } ${sortState === 'sorting' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {option.icon}
                      <span className="text-xs font-medium">{option.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Direction Toggle */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">
                  Direction
                </label>
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => handleDirectionChange('asc')}
                    disabled={sortState === 'sorting'}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                      sortDirection === 'asc'
                        ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/50'
                        : 'bg-surface-800/50 text-surface-400 hover:bg-surface-800 hover:text-surface-200'
                    } ${sortState === 'sorting' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ArrowUpIcon className="w-4 h-4" />
                    A-Z
                  </motion.button>
                  <motion.button
                    onClick={() => handleDirectionChange('desc')}
                    disabled={sortState === 'sorting'}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                      sortDirection === 'desc'
                        ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/50'
                        : 'bg-surface-800/50 text-surface-400 hover:bg-surface-800 hover:text-surface-200'
                    } ${sortState === 'sorting' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ArrowDownIcon className="w-4 h-4" />
                    Z-A
                  </motion.button>
                </div>
              </div>

              {/* Subdomain Grouping Toggle */}
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-surface-300">
                      Group subdomains
                    </span>
                    <div
                      className="relative"
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                    >
                      <InfoIcon className="w-4 h-4 text-surface-500 cursor-help" />

                      {/* Tooltip */}
                      <AnimatePresence>
                        {showTooltip && (
                          <motion.div
                            initial={{ opacity: 0, y: 5, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 5, scale: 0.95 }}
                            className="tooltip left-6 -top-2 w-56"
                          >
                            Groups subdomains with their parent domain
                            <br />
                            <span className="text-surface-400">e.g., docs.github.com → github.com</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <button
                    onClick={handleSubdomainToggle}
                    disabled={sortState === 'sorting'}
                    className={`toggle-switch ${groupSubdomains ? 'bg-brand-500' : 'bg-surface-700'} ${sortState === 'sorting' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    data-checked={groupSubdomains}
                  >
                    <span className={`toggle-switch-thumb ${groupSubdomains ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              {/* Sort Buttons */}
              <div className="flex gap-2 pt-2">
                <motion.button
                  onClick={handleSortWindow}
                  disabled={sortState === 'sorting'}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                    sortState === 'success'
                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                      : sortState === 'error'
                      ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                      : 'btn-primary'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {sortState === 'sorting' ? (
                    <>
                      <Spinner className="w-4 h-4" />
                      Sorting...
                    </>
                  ) : sortState === 'success' ? (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      Sorted!
                    </>
                  ) : sortState === 'error' ? (
                    <>
                      <XIcon className="w-4 h-4" />
                      Failed
                    </>
                  ) : (
                    <>
                      <SortIcon className="w-4 h-4" />
                      This Window
                    </>
                  )}
                </motion.button>
                <motion.button
                  onClick={handleSortAllWindows}
                  disabled={sortState === 'sorting'}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                    sortState === 'success'
                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                      : sortState === 'error'
                      ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                      : 'btn-secondary'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {sortState === 'sorting' ? (
                    <>
                      <Spinner className="w-4 h-4" />
                      Sorting...
                    </>
                  ) : sortState === 'success' ? (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      Sorted!
                    </>
                  ) : sortState === 'error' ? (
                    <>
                      <XIcon className="w-4 h-4" />
                      Failed
                    </>
                  ) : (
                    <>
                      <WindowsIcon className="w-4 h-4" />
                      All Windows
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Icons
function SortIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  )
}

function TextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  )
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  )
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
