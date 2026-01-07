import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { TabInfo, WindowInfo } from '@/types/domain'

export type ContextMode = 'all' | 'current-window' | 'selected'

interface TabContextSelectorProps {
  windows: WindowInfo[]
  currentWindowId?: number
  value: {
    mode: ContextMode
    selectedTabs: TabInfo[]
  }
  onChange: (value: { mode: ContextMode; selectedTabs: TabInfo[] }) => void
  className?: string
}

export function TabContextSelector({
  windows,
  currentWindowId,
  value,
  onChange,
  className = '',
}: TabContextSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showTabPicker, setShowTabPicker] = useState(false)

  const allTabs = windows.flatMap((w) => w.tabs)
  const currentWindowTabs = windows.find((w) => w.id === currentWindowId)?.tabs || []

  const handleModeChange = (mode: ContextMode) => {
    if (mode === 'selected') {
      setShowTabPicker(true)
    } else {
      onChange({ mode, selectedTabs: [] })
    }
    setIsOpen(false)
  }

  const toggleTab = (tab: TabInfo) => {
    const isSelected = value.selectedTabs.some((t) => t.id === tab.id)
    const newSelected = isSelected
      ? value.selectedTabs.filter((t) => t.id !== tab.id)
      : [...value.selectedTabs, tab]

    onChange({ mode: 'selected', selectedTabs: newSelected })
  }

  const getContextLabel = () => {
    switch (value.mode) {
      case 'all':
        return `All Tabs (${allTabs.length})`
      case 'current-window':
        return `Current Window (${currentWindowTabs.length})`
      case 'selected':
        return `${value.selectedTabs.length} Tab${value.selectedTabs.length !== 1 ? 's' : ''} Selected`
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Main Selector Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full flex items-center justify-between gap-3 p-3 rounded-xl glass-card-hover"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <TabsIcon className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white">Context</p>
            <p className="text-xs text-surface-400">{getContextLabel()}</p>
          </div>
        </div>
        <ChevronIcon className={`w-5 h-5 text-surface-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 left-0 right-0 z-20 rounded-xl bg-surface-900 border border-surface-700 shadow-xl overflow-hidden"
            >
              <ContextOption
                icon={<AllIcon />}
                label="All Tabs"
                count={allTabs.length}
                selected={value.mode === 'all'}
                onClick={() => handleModeChange('all')}
              />
              <ContextOption
                icon={<WindowIcon />}
                label="Current Window"
                count={currentWindowTabs.length}
                selected={value.mode === 'current-window'}
                onClick={() => handleModeChange('current-window')}
              />
              <ContextOption
                icon={<ChecklistIcon />}
                label="Select Specific Tabs"
                count={value.mode === 'selected' ? value.selectedTabs.length : undefined}
                selected={value.mode === 'selected'}
                onClick={() => handleModeChange('selected')}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Tab Picker Modal */}
      <AnimatePresence>
        {showTabPicker && (
          <TabPickerModal
            windows={windows}
            selectedTabs={value.selectedTabs}
            onToggle={toggleTab}
            onClose={() => setShowTabPicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

interface ContextOptionProps {
  icon: React.ReactNode
  label: string
  count?: number
  selected: boolean
  onClick: () => void
}

function ContextOption({ icon, label, count, selected, onClick }: ContextOptionProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
        selected
          ? 'bg-brand-500/20 text-white'
          : 'text-surface-300 hover:bg-surface-800 hover:text-white'
      }`}
    >
      <span className={`${selected ? 'text-brand-400' : 'text-surface-500'}`}>{icon}</span>
      <span className="flex-1 text-left text-sm">{label}</span>
      {count !== undefined && (
        <span className={`text-xs ${selected ? 'text-brand-400' : 'text-surface-500'}`}>
          {count}
        </span>
      )}
      {selected && <CheckIcon className="w-4 h-4 text-brand-400" />}
    </button>
  )
}

interface TabPickerModalProps {
  windows: WindowInfo[]
  selectedTabs: TabInfo[]
  onToggle: (tab: TabInfo) => void
  onClose: () => void
}

function TabPickerModal({ windows, selectedTabs, onToggle, onClose }: TabPickerModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md max-h-[70vh] flex flex-col rounded-2xl bg-surface-900 border border-surface-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-800">
          <div>
            <h3 className="font-medium text-white">Select Tabs</h3>
            <p className="text-xs text-surface-500">
              {selectedTabs.length} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tab List */}
        <div className="flex-1 overflow-y-auto p-2">
          {windows.map((window) => (
            <div key={window.id} className="mb-4">
              <div className="px-2 py-1 mb-1">
                <p className="text-xs font-medium text-surface-500">
                  {window.topic || `Window ${window.id}`} ({window.tabs.length})
                </p>
              </div>
              <div className="space-y-1">
                {window.tabs.map((tab) => {
                  const isSelected = selectedTabs.some((t) => t.id === tab.id)
                  return (
                    <button
                      key={tab.id}
                      onClick={() => onToggle(tab)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-brand-500/20 border border-brand-500/30'
                          : 'hover:bg-surface-800 border border-transparent'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isSelected
                            ? 'bg-brand-500 border-brand-500'
                            : 'border-surface-600'
                        }`}
                      >
                        {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                      </div>
                      {tab.favIconUrl ? (
                        <img
                          src={tab.favIconUrl}
                          alt=""
                          className="w-4 h-4 rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-4 h-4 rounded bg-surface-700" />
                      )}
                      <span className="flex-1 text-left text-xs text-white truncate">
                        {tab.title || 'Untitled'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-800">
          <button
            onClick={onClose}
            className="w-full btn-primary"
          >
            Done ({selectedTabs.length} selected)
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Icons
function TabsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function AllIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  )
}

function WindowIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
    </svg>
  )
}

function ChecklistIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
