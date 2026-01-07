import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { WindowInfo, TabGroupOptions, TabInfo } from '@/types/domain'
import { DEFAULT_TAB_GROUP_OPTIONS } from '@/types/domain'
import { useWindows, useWindowTopic, useCategorizeTabs, useSmartCategorizeTabs, useTabGroups, useLLMConfig } from '../hooks'
import { TabList, ProgressOverlay, SortOptionsPanel, ViewModeToggle, ProcessingLog, type LogEntry } from '../components'
import { useViewMode } from '../context'

interface WindowOrganizerProps {
  onBack: () => void
}

export function WindowOrganizer({ onBack }: WindowOrganizerProps) {
  const { windows, loading, refresh } = useWindows()
  const { isConfigured } = useLLMConfig()
  const [selectedWindow, setSelectedWindow] = useState<WindowInfo | null>(null)

  if (!isConfigured) {
    return (
      <div className="space-y-4">
        <Header onBack={onBack} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="empty-state"
        >
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <SparklesIcon className="w-8 h-8 text-amber-400" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-xl" />
          </div>
          <h3 className="empty-state-title">AI Features Disabled</h3>
          <p className="empty-state-description mb-6">
            Configure your API provider in settings to unlock AI-powered window organization.
          </p>
          <button
            onClick={() => chrome.runtime.openOptionsPage()}
            className="btn-primary"
          >
            <span className="flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              Open Settings
            </span>
          </button>
        </motion.div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Header onBack={onBack} />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (selectedWindow) {
    return (
      <WindowDetail
        window={selectedWindow}
        onBack={() => {
          setSelectedWindow(null)
          refresh()
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <Header onBack={onBack} />

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2"
      >
        <span className="badge-info">
          <WindowIcon className="w-3.5 h-3.5" />
          {windows.length} window{windows.length !== 1 ? 's' : ''}
        </span>
        <span className="badge-neutral">
          {windows.reduce((acc, w) => acc + w.tabs.length, 0)} total tabs
        </span>
      </motion.div>

      {/* Window List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {windows.map((window, index) => (
            <motion.div
              key={window.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <WindowCard
                window={window}
                onClick={() => setSelectedWindow(window)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {windows.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="empty-state"
        >
          <WindowIcon className="empty-state-icon" />
          <h3 className="empty-state-title">No Windows Found</h3>
          <p className="empty-state-description">
            Open some browser windows to get started.
          </p>
        </motion.div>
      )}
    </div>
  )
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3"
    >
      <motion.button
        onClick={onBack}
        whileHover={{ scale: 1.05, x: -2 }}
        whileTap={{ scale: 0.95 }}
        className="btn-icon"
      >
        <BackIcon />
      </motion.button>
      <div>
        <h2 className="font-display font-semibold text-lg text-white">Organize Windows</h2>
        <p className="text-sm text-surface-500">AI-powered tab categorization</p>
      </div>
    </motion.div>
  )
}

interface WindowCardProps {
  window: WindowInfo
  onClick: () => void
}

function WindowCard({ window, onClick }: WindowCardProps) {
  const tabCount = window.tabs.length
  const domains = [...new Set(window.tabs.map((t) => getDomain(t.url)))].slice(0, 4)

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      className="group relative w-full text-left glass-card-hover p-4 overflow-hidden"
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-semibold text-white group-hover:text-brand-300 transition-colors truncate">
              {window.topic || `Window ${window.id}`}
            </h3>
            {window.focused && (
              <span className="badge-brand text-[10px] py-0.5">
                Current
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-surface-400">
              {tabCount} tab{tabCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Domain pills */}
          <div className="flex flex-wrap gap-1.5">
            {domains.map((domain) => (
              <span
                key={domain}
                className="px-2 py-0.5 text-xs rounded-md bg-surface-800 text-surface-400"
              >
                {domain}
              </span>
            ))}
            {domains.length < window.tabs.length && (
              <span className="px-2 py-0.5 text-xs rounded-md bg-surface-800 text-surface-500">
                +{window.tabs.length - domains.length} more
              </span>
            )}
          </div>
        </div>

        {/* Icon with gradient */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <WindowIcon className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Arrow indicator */}
      <motion.div
        className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-600 group-hover:text-surface-400 transition-colors"
        initial={false}
        animate={{ x: 0 }}
      >
        <ChevronRightIcon className="w-5 h-5" />
      </motion.div>
    </motion.button>
  )
}

interface WindowDetailProps {
  window: WindowInfo
  onBack: () => void
}

function WindowDetail({ window, onBack }: WindowDetailProps) {
  const { detectTopic, loading: detectingTopic } = useWindowTopic()
  const { categorize, loading: categorizingBasic, results: basicResults } = useCategorizeTabs()
  const { categorize: smartCategorize, loading: categorizingSmart, results: smartResults } = useSmartCategorizeTabs()
  const { createGroups, loading: grouping } = useTabGroups()
  const { compactMode } = useViewMode()
  const [topic, setTopic] = useState(window.topic ?? '')
  const [editingTopic, setEditingTopic] = useState(false)
  const [useSmartMode, setUseSmartMode] = useState(true)
  const [showTabList, setShowTabList] = useState(true)
  const [processingLogs, setProcessingLogs] = useState<LogEntry[]>([])

  // Determine which results to use - normalize to common format
  const categorizing = useSmartMode ? categorizingSmart : categorizingBasic

  // Normalize results to a common format with category and subtopic
  const results = useSmartMode
    ? smartResults.map((r) => ({
        tab: r.tab,
        category: r.topic, // Smart mode uses 'topic' as category
        subtopic: r.subtopic,
      }))
    : basicResults.map((r) => ({
        tab: r.tab,
        category: r.category,
        subtopic: undefined as string | undefined,
      }))

  // Tab group options state
  const [groupOptions, setGroupOptions] = useState<TabGroupOptions>(DEFAULT_TAB_GROUP_OPTIONS)
  const [showGroupOptions, setShowGroupOptions] = useState(false)

  // Load group options preferences
  useEffect(() => {
    chrome.storage.local.get('tabGroupPreferences', (result) => {
      if (result.tabGroupPreferences) {
        setGroupOptions({ ...DEFAULT_TAB_GROUP_OPTIONS, ...result.tabGroupPreferences })
      }
    })
  }, [])

  // Save group options preferences
  const saveGroupOptions = (options: Partial<TabGroupOptions>) => {
    const newOptions = { ...groupOptions, ...options }
    setGroupOptions(newOptions)
    chrome.storage.local.set({ tabGroupPreferences: newOptions })
  }

  const addLog = (type: LogEntry['type'], message: string, details?: string) => {
    setProcessingLogs(prev => [...prev, {
      id: Date.now().toString(),
      timestamp: new Date(),
      type,
      message,
      details,
    }])
  }

  const handleDetectTopic = async () => {
    addLog('info', 'Detecting window topic...')
    const result = await detectTopic(window.id)
    if (result) {
      setTopic(result.topic)
      addLog('success', `Topic detected: "${result.topic}"`, `Confidence: ${(result.confidence * 100).toFixed(0)}%`)
    } else {
      addLog('error', 'Failed to detect topic')
    }
  }

  const handleCategorize = async () => {
    addLog('info', `Starting ${useSmartMode ? 'smart' : 'basic'} categorization for ${window.tabs.length} tabs...`)
    if (useSmartMode) {
      await smartCategorize(window.id, topic || undefined)
      addLog('success', `Categorized ${smartResults.length || window.tabs.length} tabs`,
        `Categories: ${Object.keys(categoryGroups).join(', ')}`)
    } else {
      await categorize(window.id)
      addLog('success', `Categorized ${basicResults.length || window.tabs.length} tabs`)
    }
  }

  const handleCreateGroups = async () => {
    if (results.length === 0) return
    await createGroups(results, window.id, groupOptions)
  }

  const categories = new Map(results.map((r) => [r.tab.id, r.category]))
  const subtopics = new Map(results.map((r) => [r.tab.id, r.subtopic]))

  // Group results by category for preview
  const categoryGroups = results.reduce((acc, { tab, category }) => {
    if (!acc[category]) acc[category] = []
    acc[category].push(tab)
    return acc
  }, {} as Record<string, TabInfo[]>)

  const categoryColors: Record<string, string> = {
    Technology: 'from-blue-500 to-cyan-500',
    Shopping: 'from-emerald-500 to-teal-500',
    News: 'from-red-500 to-orange-500',
    Entertainment: 'from-purple-500 to-pink-500',
    Social: 'from-pink-500 to-rose-500',
    Finance: 'from-green-500 to-emerald-500',
    Reference: 'from-yellow-500 to-amber-500',
    Productivity: 'from-indigo-500 to-blue-500',
    Other: 'from-gray-500 to-gray-600',
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3"
      >
        <motion.button
          onClick={onBack}
          whileHover={{ scale: 1.05, x: -2 }}
          whileTap={{ scale: 0.95 }}
          className="btn-icon"
        >
          <BackIcon />
        </motion.button>
        <div className="flex-1 min-w-0">
          {editingTopic ? (
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onBlur={() => setEditingTopic(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingTopic(false)}
              className="input-field py-2 text-lg font-display font-semibold"
              autoFocus
              placeholder="Window topic..."
            />
          ) : (
            <motion.h2
              className="font-display font-semibold text-lg text-white cursor-pointer hover:text-brand-300 transition-colors truncate"
              onClick={() => setEditingTopic(true)}
              whileHover={{ x: 2 }}
            >
              {topic || `Window ${window.id}`}
              <PencilIcon className="inline-block w-4 h-4 ml-2 text-surface-500" />
            </motion.h2>
          )}
          <p className="text-sm text-surface-500">
            {window.tabs.length} tabs
          </p>
        </div>
      </motion.div>

      {/* Sort Options Panel */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <SortOptionsPanel windowId={window.id} />
      </motion.div>

      {/* AI Categorization Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-4 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-white">AI Categorization</h3>
              <p className="text-xs text-surface-500">Organize tabs by content</p>
            </div>
          </div>

          {/* Smart mode toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-surface-500">Smart</span>
            <button
              onClick={() => setUseSmartMode(!useSmartMode)}
              className={`toggle-switch ${useSmartMode ? 'bg-brand-500' : 'bg-surface-700'}`}
              data-checked={useSmartMode}
            >
              <span className={`toggle-switch-thumb ${useSmartMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <motion.button
            onClick={handleDetectTopic}
            disabled={detectingTopic}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            {detectingTopic ? (
              <>
                <Spinner className="w-4 h-4" />
                Detecting...
              </>
            ) : (
              <>
                <BrainIcon className="w-4 h-4" />
                Detect Topic
              </>
            )}
          </motion.button>
          <motion.button
            onClick={handleCategorize}
            disabled={categorizing}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {categorizing ? (
              <>
                <Spinner className="w-4 h-4" />
                Categorizing...
              </>
            ) : (
              <>
                <TagIcon className="w-4 h-4" />
                Categorize
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Categorization Results */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="space-y-4"
          >
            {/* Category Preview */}
            <div className="glass-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                  <span className="font-medium text-white">
                    {results.length} tabs categorized
                  </span>
                </div>
                <button
                  onClick={() => setShowGroupOptions(!showGroupOptions)}
                  className="btn-ghost text-xs flex items-center gap-1"
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                  Options
                  <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${showGroupOptions ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Category pills preview */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(categoryGroups).map(([category, tabs]) => (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-800"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${categoryColors[category] || categoryColors.Other}`} />
                    <span className="text-sm text-white">{category}</span>
                    <span className="text-xs text-surface-500">{tabs.length}</span>
                  </motion.div>
                ))}
              </div>

              {/* Group Options (collapsible) */}
              <AnimatePresence>
                {showGroupOptions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-4 border-t border-surface-800 space-y-4 overflow-hidden"
                  >
                    {/* Min Tabs Stepper */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-surface-300">
                        Min tabs per group
                      </label>
                      <div className="flex items-center gap-2">
                        <motion.button
                          onClick={() => saveGroupOptions({ minTabsForGroup: Math.max(1, groupOptions.minTabsForGroup - 1) })}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="btn-icon w-8 h-8"
                        >
                          <MinusIcon className="w-4 h-4" />
                        </motion.button>
                        <span className="w-8 text-center font-mono font-medium text-white">
                          {groupOptions.minTabsForGroup}
                        </span>
                        <motion.button
                          onClick={() => saveGroupOptions({ minTabsForGroup: Math.min(10, groupOptions.minTabsForGroup + 1) })}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="btn-icon w-8 h-8"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>

                    {/* AI Subtopics Toggle */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-surface-300">
                        Use AI subtopics
                      </label>
                      <button
                        onClick={() => saveGroupOptions({ useAISubtopics: !groupOptions.useAISubtopics })}
                        className={`toggle-switch ${groupOptions.useAISubtopics ? 'bg-brand-500' : 'bg-surface-700'}`}
                        data-checked={groupOptions.useAISubtopics}
                      >
                        <span className={`toggle-switch-thumb ${groupOptions.useAISubtopics ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {/* Collapse Groups Toggle */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-surface-300">
                        Collapse after creation
                      </label>
                      <button
                        onClick={() => saveGroupOptions({ collapseGroupsOnCreate: !groupOptions.collapseGroupsOnCreate })}
                        className={`toggle-switch ${groupOptions.collapseGroupsOnCreate ? 'bg-brand-500' : 'bg-surface-700'}`}
                        data-checked={groupOptions.collapseGroupsOnCreate}
                      >
                        <span className={`toggle-switch-thumb ${groupOptions.collapseGroupsOnCreate ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Create Groups Button */}
              <motion.button
                onClick={handleCreateGroups}
                disabled={grouping}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {grouping ? (
                  <>
                    <Spinner className="w-4 h-4" />
                    Creating Groups...
                  </>
                ) : (
                  <>
                    <GroupIcon className="w-4 h-4" />
                    Create Tab Groups
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing Log */}
      {processingLogs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ProcessingLog logs={processingLogs} title="Processing Details" maxHeight="150px" />
        </motion.div>
      )}

      {/* Tab List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between p-3 glass-card mb-2">
          <button
            onClick={() => setShowTabList(!showTabList)}
            className="flex items-center gap-2"
          >
            <span className="text-sm font-medium text-surface-300">
              Tab List ({window.tabs.length})
            </span>
            <ChevronDownIcon className={`w-4 h-4 text-surface-500 transition-transform ${showTabList ? 'rotate-180' : ''}`} />
          </button>
          <ViewModeToggle />
        </div>

        <AnimatePresence>
          {showTabList && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <TabList
                tabs={window.tabs}
                showCategory={results.length > 0}
                categories={categories}
                subtopics={subtopics}
                compact={compactMode}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Loading Overlay */}
      {(categorizing || grouping) && (
        <ProgressOverlay
          progress={{ current: 0, total: 1, status: categorizing ? 'Categorizing tabs...' : 'Creating groups...' }}
        />
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

// Icons
function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function WindowIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  )
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function GroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`${className || "w-4 h-4"} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
