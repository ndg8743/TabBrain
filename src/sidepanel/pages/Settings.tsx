import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useLLMConfig, usePreferences } from '../hooks'
import type { SortBy } from '@/types/domain'

interface SettingsProps {
  onBack: () => void
}

export function Settings({ onBack }: SettingsProps) {
  const { config, isConfigured, testConnection } = useLLMConfig()
  const {
    preferences,
    loading: prefsLoading,
    saving,
    updateSorting,
    updateTabGroups,
    updateMerge,
    updateBookmarks,
    reset,
  } = usePreferences()

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testConnection()
    setTestResult(result ?? false)
    setTesting(false)
  }

  const handleReset = async () => {
    await reset()
    setShowResetConfirm(false)
  }

  return (
    <div className="space-y-5">
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
        <div className="flex-1">
          <h2 className="font-display font-semibold text-lg text-white">Settings</h2>
          <p className="text-sm text-surface-500">Configure your preferences</p>
        </div>
        {saving && (
          <span className="badge-brand text-xs">
            <SaveIcon className="w-3 h-3" />
            Saving...
          </span>
        )}
      </motion.div>

      <div className="space-y-4">
        {/* AI Provider Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-white">AI Provider</h3>
              <p className="text-xs text-surface-500">Configure your LLM backend</p>
            </div>
          </div>

          {isConfigured ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/50">
                <StatusDot status={testResult === true ? 'success' : testResult === false ? 'error' : 'idle'} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">
                    {config?.provider === 'custom' ? 'Custom Provider' : config?.provider}
                  </p>
                  <p className="text-xs text-surface-500 truncate">
                    {config?.model} • {config?.baseUrl}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <motion.button
                  onClick={handleTest}
                  disabled={testing}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-secondary flex-1 text-sm"
                >
                  {testing ? (
                    <span className="flex items-center gap-2">
                      <Spinner className="w-4 h-4" />
                      Testing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <TestIcon className="w-4 h-4" />
                      Test Connection
                    </span>
                  )}
                </motion.button>
                <motion.button
                  onClick={() => chrome.runtime.openOptionsPage()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-ghost text-sm"
                >
                  <SettingsIcon className="w-4 h-4" />
                </motion.button>
              </div>

              <AnimatePresence>
                {testResult !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -5, height: 0 }}
                    className={`p-3 rounded-xl ${
                      testResult
                        ? 'bg-emerald-500/10 border border-emerald-500/30'
                        : 'bg-red-500/10 border border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {testResult ? (
                        <>
                          <CheckIcon className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm text-emerald-400">Connection successful!</span>
                        </>
                      ) : (
                        <>
                          <XIcon className="w-4 h-4 text-red-400" />
                          <span className="text-sm text-red-400">Connection failed</span>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-surface-400 mb-4">
                Configure your AI provider to enable smart features.
              </p>
              <motion.button
                onClick={() => chrome.runtime.openOptionsPage()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary"
              >
                <span className="flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4" />
                  Configure AI Provider
                </span>
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* OpenWebUI Setup Guide */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
              <OpenWebUIIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-white">OpenWebUI Setup</h3>
              <p className="text-xs text-surface-500">Configuration guide for Open WebUI</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-surface-800/50">
              <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">Base URL</p>
              <code className="block text-sm text-brand-400 font-mono bg-surface-900/50 px-3 py-2 rounded-lg">
                https://your_url/api
              </code>
              <p className="text-xs text-surface-500 mt-2">
                Replace <span className="text-brand-400 font-mono">your_url</span> with your OpenWebUI domain
              </p>
            </div>

            <div className="p-3 rounded-xl bg-surface-800/50">
              <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">Provider</p>
              <code className="block text-sm text-emerald-400 font-mono bg-surface-900/50 px-3 py-2 rounded-lg">
                openai
              </code>
              <p className="text-xs text-surface-500 mt-2">
                OpenWebUI uses OpenAI-compatible API format
              </p>
            </div>

            <div className="p-3 rounded-xl bg-surface-800/50">
              <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">API Key</p>
              <code className="block text-sm text-amber-400 font-mono bg-surface-900/50 px-3 py-2 rounded-lg">
                sk-xxxxxxxxxxxxxxxx
              </code>
              <p className="text-xs text-surface-500 mt-2">
                Get your API key from OpenWebUI Settings → Account → API Keys
              </p>
            </div>

            <div className="p-3 rounded-xl bg-surface-800/50">
              <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">Model Examples</p>
              <div className="space-y-1.5">
                <code className="block text-sm text-violet-400 font-mono bg-surface-900/50 px-3 py-1.5 rounded-lg">
                  llama3.1:70b
                </code>
                <code className="block text-sm text-violet-400 font-mono bg-surface-900/50 px-3 py-1.5 rounded-lg">
                  qwen2.5:72b
                </code>
                <code className="block text-sm text-violet-400 font-mono bg-surface-900/50 px-3 py-1.5 rounded-lg">
                  mistral-large
                </code>
              </div>
              <p className="text-xs text-surface-500 mt-2">
                Use the model name as shown in your OpenWebUI models list
              </p>
            </div>

            <motion.button
              onClick={() => chrome.runtime.openOptionsPage()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-secondary w-full text-sm"
            >
              <span className="flex items-center justify-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                Open Full Settings
              </span>
            </motion.button>
          </div>
        </motion.div>

        {/* Sorting Defaults */}
        {!prefsLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <SortIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-white">Sorting Defaults</h3>
                <p className="text-xs text-surface-500">Tab sorting preferences</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-surface-400 uppercase tracking-wider block mb-2">
                  Sort By
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['domain', 'title', 'dateOpened'] as SortBy[]).map((option) => (
                    <motion.button
                      key={option}
                      onClick={() => updateSorting({ sortBy: option })}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        preferences.sorting.sortBy === option
                          ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/50'
                          : 'bg-surface-800/50 text-surface-400 hover:bg-surface-800'
                      }`}
                    >
                      {option === 'dateOpened' ? 'Date' : option.charAt(0).toUpperCase() + option.slice(1)}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-surface-400 uppercase tracking-wider block mb-2">
                  Direction
                </label>
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => updateSorting({ sortDirection: 'asc' })}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                      preferences.sorting.sortDirection === 'asc'
                        ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/50'
                        : 'bg-surface-800/50 text-surface-400 hover:bg-surface-800'
                    }`}
                  >
                    <ArrowUpIcon className="w-4 h-4" />
                    A-Z / Oldest
                  </motion.button>
                  <motion.button
                    onClick={() => updateSorting({ sortDirection: 'desc' })}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                      preferences.sorting.sortDirection === 'desc'
                        ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/50'
                        : 'bg-surface-800/50 text-surface-400 hover:bg-surface-800'
                    }`}
                  >
                    <ArrowDownIcon className="w-4 h-4" />
                    Z-A / Newest
                  </motion.button>
                </div>
              </div>

              <ToggleRow
                label="Group Subdomains"
                description="Group docs.github.com with github.com"
                checked={preferences.sorting.groupSubdomains}
                onChange={(checked) => updateSorting({ groupSubdomains: checked })}
              />
            </div>
          </motion.div>
        )}

        {/* Tab Group Defaults */}
        {!prefsLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <GroupIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-white">Tab Groups</h3>
                <p className="text-xs text-surface-500">Group creation settings</p>
              </div>
            </div>

            <div className="space-y-4">
              <SliderRow
                label="Min Tabs for Group"
                description="Only create groups with at least this many tabs"
                value={preferences.tabGroups.minTabsForGroup}
                min={1}
                max={5}
                onChange={(value) => updateTabGroups({ minTabsForGroup: value })}
              />

              <ToggleRow
                label="Use AI Subtopics"
                description="Name groups by specific topic instead of category"
                checked={preferences.tabGroups.useAISubtopics}
                onChange={(checked) => updateTabGroups({ useAISubtopics: checked })}
              />

              <ToggleRow
                label="Collapse After Create"
                description="Auto-collapse new tab groups"
                checked={preferences.tabGroups.collapseGroupsOnCreate}
                onChange={(checked) => updateTabGroups({ collapseGroupsOnCreate: checked })}
              />
            </div>
          </motion.div>
        )}

        {/* Window Merge Threshold */}
        {!prefsLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <MergeIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-white">Window Merge</h3>
                <p className="text-xs text-surface-500">Merge suggestion sensitivity</p>
              </div>
            </div>

            <SliderRow
              label="Overlap Threshold"
              description="Suggest merging windows with this much domain overlap"
              value={Math.round(preferences.merge.overlapThreshold * 100)}
              min={30}
              max={90}
              step={10}
              suffix="%"
              onChange={(value) => updateMerge({ overlapThreshold: value / 100 })}
            />
          </motion.div>
        )}

        {/* Bookmark Settings */}
        {!prefsLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                <BookmarkIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-white">Bookmarks</h3>
                <p className="text-xs text-surface-500">Bookmark organization settings</p>
              </div>
            </div>

            <SliderRow
              label="Large Folder Threshold"
              description="Flag folders with more items than this for splitting"
              value={preferences.bookmarks.largeFolderThreshold}
              min={50}
              max={200}
              step={25}
              onChange={(value) => updateBookmarks({ largeFolderThreshold: value })}
            />
          </motion.div>
        )}

        {/* About & Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-surface-600 to-surface-700 flex items-center justify-center">
              <InfoIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-white">About</h3>
              <p className="text-xs text-surface-500">App information</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-800/50">
              <span className="text-sm text-surface-400">Version</span>
              <span className="text-sm font-medium text-white">1.1.0</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-800/50">
              <p className="text-xs text-surface-500 mb-2">Keyboard Shortcuts</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-300">Open Side Panel</span>
                <kbd className="px-2 py-1 bg-surface-700 rounded text-xs text-surface-300 font-mono">
                  Alt + T
                </kbd>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-800/50">
              <p className="text-xs text-surface-500 mb-2">Privacy</p>
              <p className="text-xs text-surface-400">
                TabBrain only accesses tab URLs and titles. Page content is never read.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Reset Section */}
        {!prefsLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass-card p-4"
          >
            <AnimatePresence mode="wait">
              {showResetConfirm ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <p className="text-sm text-surface-300 text-center">
                    Reset all preferences to defaults?
                  </p>
                  <div className="flex gap-2">
                    <motion.button
                      onClick={handleReset}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn-danger flex-1"
                    >
                      Reset All
                    </motion.button>
                    <motion.button
                      onClick={() => setShowResetConfirm(false)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowResetConfirm(true)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full p-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors text-center"
                >
                  Reset to Defaults
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// Helper Components
function StatusDot({ status }: { status: 'idle' | 'success' | 'error' }) {
  const classes = {
    idle: 'bg-surface-500',
    success: 'bg-emerald-500 shadow-lg shadow-emerald-500/50',
    error: 'bg-red-500 shadow-lg shadow-red-500/50',
  }

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`w-2.5 h-2.5 rounded-full ${classes[status]}`}
    />
  )
}

interface ToggleRowProps {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-surface-200">{label}</p>
        <p className="text-xs text-surface-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`toggle-switch ${checked ? 'bg-brand-500' : 'bg-surface-700'}`}
        data-checked={checked}
      >
        <span className={`toggle-switch-thumb ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

interface SliderRowProps {
  label: string
  description: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}

function SliderRow({ label, description, value, min, max, step = 1, suffix = '', onChange }: SliderRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm text-surface-200">{label}</p>
          <p className="text-xs text-surface-500">{description}</p>
        </div>
        <span className="text-sm font-mono font-medium text-brand-400 min-w-[3rem] text-right">
          {value}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-surface-800 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-brand-500
          [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:shadow-brand-500/30
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-110"
      />
    </div>
  )
}

// Icons
function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
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

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function TestIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function SortIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
    </svg>
  )
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  )
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function GroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
}

function MergeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  )
}

function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  )
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function OpenWebUIIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
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
