import { useState, useEffect } from 'react'
import { useWindows, useWindowMerge, type MergeSuggestion } from '../hooks'
import { ConfirmDialog } from '../components'

interface WindowMergeProps {
  onBack: () => void
}

export function WindowMerge({ onBack }: WindowMergeProps) {
  const { windows, refresh: refreshWindows } = useWindows()
  const { suggestions, loading, error, findSuggestions, mergeWindows } = useWindowMerge()
  const [selectedMerge, setSelectedMerge] = useState<MergeSuggestion | null>(null)

  useEffect(() => {
    findSuggestions()
  }, [findSuggestions])

  const handleMerge = async () => {
    if (!selectedMerge) return

    await mergeWindows(selectedMerge.sourceId, selectedMerge.targetId)
    setSelectedMerge(null)
    refreshWindows()
  }

  const getWindowInfo = (id: number) => {
    return windows.find(w => w.id === id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <BackIcon />
        </button>
        <h2 className="text-lg font-medium">Merge Windows</h2>
      </div>

      {loading && !suggestions.length && (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Analyzing windows...</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {!loading && suggestions.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No windows with overlapping content found.</p>
          <p className="text-sm text-gray-400">
            Windows are suggested for merging when they share 50% or more of the same domains.
          </p>
          <button
            onClick={findSuggestions}
            className="mt-4 px-4 py-2 text-sm text-primary-600 hover:text-primary-700"
          >
            Scan Again
          </button>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Found {suggestions.length} window{suggestions.length !== 1 ? 's' : ''} that could be merged
          </p>

          {suggestions.map((suggestion, idx) => {
            const sourceWindow = getWindowInfo(suggestion.sourceId)
            const targetWindow = getWindowInfo(suggestion.targetId)

            return (
              <MergeSuggestionCard
                key={idx}
                suggestion={suggestion}
                sourceWindow={sourceWindow}
                targetWindow={targetWindow}
                onMerge={() => setSelectedMerge(suggestion)}
              />
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={selectedMerge !== null}
        title="Merge Windows"
        message={`Move all tabs from window ${selectedMerge?.sourceId} to window ${selectedMerge?.targetId}? The source window will be closed.`}
        confirmLabel="Merge"
        onConfirm={handleMerge}
        onCancel={() => setSelectedMerge(null)}
      />
    </div>
  )
}

interface MergeSuggestionCardProps {
  suggestion: MergeSuggestion
  sourceWindow?: { id: number; tabs: { url: string; title: string }[] }
  targetWindow?: { id: number; tabs: { url: string; title: string }[] }
  onMerge: () => void
}

function MergeSuggestionCard({
  suggestion,
  sourceWindow,
  targetWindow,
  onMerge,
}: MergeSuggestionCardProps) {
  const sourceDomains = [...new Set(sourceWindow?.tabs.map(t => getDomain(t.url)) ?? [])].slice(0, 3)
  const targetDomains = [...new Set(targetWindow?.tabs.map(t => getDomain(t.url)) ?? [])].slice(0, 3)

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
          {Math.round(suggestion.overlap * 100)}% overlap
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm font-medium mb-1">Source (will close)</p>
          <p className="text-xs text-gray-500">
            Window {suggestion.sourceId} • {sourceWindow?.tabs.length ?? 0} tabs
          </p>
          <p className="text-xs text-gray-400 truncate mt-1">
            {sourceDomains.join(', ')}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium mb-1">Target</p>
          <p className="text-xs text-gray-500">
            Window {suggestion.targetId} • {targetWindow?.tabs.length ?? 0} tabs
          </p>
          <p className="text-xs text-gray-400 truncate mt-1">
            {targetDomains.join(', ')}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <ArrowIcon />
      </div>

      <button
        onClick={onMerge}
        className="w-full mt-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
      >
        Merge Windows
      </button>
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

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  )
}
