import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { DuplicateGroup } from '@/types/domain'
import { useDuplicateTabs } from '../hooks'
import { ConfirmDialog, ViewModeToggle } from '../components'
import { useViewMode } from '../context'

interface DuplicateFinderProps {
  onBack: () => void
}

export function DuplicateFinder({ onBack }: DuplicateFinderProps) {
  const { duplicates, loading, error, scan, closeDuplicates } = useDuplicateTabs()
  const { compactMode } = useViewMode()
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showConfirm, setShowConfirm] = useState(false)
  const [closing, setClosing] = useState(false)

  // Flatten all duplicate tabs for selection
  const allDuplicateTabs = useMemo(() => {
    return duplicates.flatMap((group) => group.tabs.slice(1)) // Skip first (keep)
  }, [duplicates])

  const totalDuplicates = allDuplicateTabs.length

  const handleScan = async () => {
    setSelectedIds(new Set())
    await scan()
  }

  const handleSelectAllDuplicates = () => {
    setSelectedIds(new Set(allDuplicateTabs.map((t) => t.id)))
  }

  const handleClearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleCloseDuplicates = async () => {
    if (selectedIds.size === 0) return

    setClosing(true)
    await closeDuplicates(Array.from(selectedIds))
    setSelectedIds(new Set())
    setClosing(false)
    setShowConfirm(false)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <motion.button
          onClick={onBack}
          whileHover={{ scale: 1.05, x: -2 }}
          whileTap={{ scale: 0.95 }}
          className="btn-icon"
        >
          <BackIcon className="w-5 h-5" />
        </motion.button>
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            Find Duplicates
          </h2>
          <p className="text-sm text-surface-400">
            Detect and remove duplicate tabs
          </p>
        </div>
      </motion.div>

      {/* Empty state - initial scan */}
      {!duplicates.length && !loading && !error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="empty-state"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
            className="relative mb-6"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-400 via-rose-500 to-pink-600 flex items-center justify-center">
              <SearchIcon className="w-10 h-10 text-white" />
            </div>
            <div className="absolute inset-0 rounded-3xl bg-rose-500/30 blur-xl animate-pulse" />
          </motion.div>
          <h3 className="empty-state-title">No duplicates scanned yet</h3>
          <p className="empty-state-description mb-6">
            Scan your browser to find and remove duplicate tabs across all windows.
          </p>
          <motion.button
            onClick={handleScan}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary"
          >
            <span className="flex items-center gap-2">
              <ScanIcon className="w-5 h-5" />
              Scan for Duplicates
            </span>
          </motion.button>
        </motion.div>
      )}

      {/* Loading state */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-12"
          >
            <div className="relative mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 rounded-full border-4 border-surface-700 border-t-brand-500"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <SearchIcon className="w-6 h-6 text-brand-400" />
              </div>
            </div>
            <p className="text-surface-300 font-medium">Scanning tabs...</p>
            <p className="text-surface-500 text-sm mt-1">Looking for duplicates across all windows</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-red-500/30 bg-red-500/10"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <AlertIcon className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="font-medium text-red-200">Error scanning tabs</p>
              <p className="text-sm text-red-300/70 mt-0.5">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Results */}
      {duplicates.length > 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between glass-card p-4"
          >
            <div>
              <p className="text-2xl font-display font-bold text-white">
                {totalDuplicates}
                <span className="text-surface-400 text-base font-normal ml-2">
                  duplicate{totalDuplicates !== 1 ? 's' : ''} in {duplicates.length} group{duplicates.length !== 1 ? 's' : ''}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleScan}
                className="btn-ghost text-sm"
              >
                <RefreshIcon className="w-4 h-4 mr-1.5" />
                Rescan
              </button>
            </div>
          </motion.div>

          {/* Quick actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAllDuplicates}
                className="btn-ghost text-sm"
              >
                <SelectAllIcon className="w-4 h-4 mr-1.5" />
                Select All ({totalDuplicates})
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleClearSelection}
                  className="btn-ghost text-sm"
                >
                  Clear Selection
                </button>
              )}
            </div>
            <ViewModeToggle />
          </div>

          {/* Duplicate groups */}
          <div className="space-y-3">
            {duplicates.map((group, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <DuplicateGroupCard
                  group={group}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  compact={compactMode}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Floating action bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-4 right-4 z-30"
          >
            <div className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="badge-brand">
                  {selectedIds.size} selected
                </div>
              </div>
              <motion.button
                onClick={() => setShowConfirm(true)}
                disabled={closing}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-danger flex items-center gap-2"
              >
                <TrashIcon className="w-4 h-4" />
                Close Tab{selectedIds.size !== 1 ? 's' : ''}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={showConfirm}
        title="Close Duplicate Tabs"
        message={`Are you sure you want to close ${selectedIds.size} duplicate tab${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`}
        confirmLabel="Close Tabs"
        variant="danger"
        onConfirm={handleCloseDuplicates}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  )
}

interface DuplicateGroupCardProps {
  group: DuplicateGroup
  selectedIds: Set<number>
  onSelectionChange: (ids: Set<number>) => void
  compact?: boolean
}

function DuplicateGroupCard({
  group,
  selectedIds,
  onSelectionChange,
  compact = false,
}: DuplicateGroupCardProps) {
  const keepTab = group.tabs[0]
  const duplicateTabs = group.tabs.slice(1)
  const [isExpanded, setIsExpanded] = useState(true)

  const toggleTab = (id: number) => {
    const newSelection = new Set(selectedIds)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    onSelectionChange(newSelection)
  }

  const selectAllInGroup = () => {
    const newSelection = new Set(selectedIds)
    duplicateTabs.forEach((tab) => newSelection.add(tab.id))
    onSelectionChange(newSelection)
  }

  const allSelected = duplicateTabs.every((tab) => selectedIds.has(tab.id))

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-surface-800/50 transition-colors"
      >
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronIcon className="w-5 h-5 text-surface-500" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate" title={group.normalizedUrl}>
            {group.normalizedUrl}
          </p>
          <p className="text-xs text-surface-500 mt-0.5">
            {group.tabs.length} tabs total
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            selectAllInGroup()
          }}
          className={`text-xs px-2 py-1 rounded-lg transition-colors ${
            allSelected
              ? 'bg-brand-500/20 text-brand-400'
              : 'bg-surface-800 text-surface-400 hover:text-white'
          }`}
        >
          {allSelected ? 'All Selected' : 'Select All'}
        </button>
      </div>

      {/* Tabs list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-surface-800">
              {/* Keep tab */}
              {keepTab && (
                <div className={`${compact ? 'px-3 py-2' : 'px-4 py-3'} bg-emerald-500/10 border-b border-surface-800`}>
                  <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
                    <div className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-lg bg-emerald-500/20 flex items-center justify-center`}>
                      <CheckIcon className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-emerald-400`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="badge-success text-[10px]">KEEP</span>
                        <span className={`${compact ? 'text-xs' : 'text-sm'} text-white truncate`}>{keepTab.title}</span>
                      </div>
                    </div>
                    <span className="badge-neutral text-[10px]">
                      W{keepTab.windowId}
                    </span>
                  </div>
                </div>
              )}

              {/* Duplicate tabs */}
              {duplicateTabs.map((tab, idx) => (
                <motion.div
                  key={tab.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  onClick={() => toggleTab(tab.id)}
                  className={`${compact ? 'px-3 py-2' : 'px-4 py-3'} flex items-center ${compact ? 'gap-2' : 'gap-3'} cursor-pointer transition-colors ${
                    selectedIds.has(tab.id)
                      ? 'bg-brand-500/10'
                      : 'hover:bg-surface-800/50'
                  } ${idx < duplicateTabs.length - 1 ? 'border-b border-surface-800/50' : ''}`}
                >
                  <div className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} rounded-md border-2 flex items-center justify-center transition-all ${
                    selectedIds.has(tab.id)
                      ? 'bg-brand-500 border-brand-500'
                      : 'border-surface-600 bg-transparent'
                  }`}>
                    {selectedIds.has(tab.id) && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      >
                        <CheckIcon className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`${compact ? 'text-xs' : 'text-sm'} text-surface-200 truncate block`}>{tab.title}</span>
                  </div>
                  <span className="badge-neutral text-[10px]">
                    W{tab.windowId}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Icons
function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function ScanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

function SelectAllIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
