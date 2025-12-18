import type { OperationProgress } from '@/types/domain'

interface ProgressBarProps {
  progress: OperationProgress
  showPercentage?: boolean
}

export function ProgressBar({ progress, showPercentage = true }: ProgressBarProps) {
  const percentage = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {progress.status}
        </span>
        {showPercentage && (
          <span className="text-sm text-gray-500">
            {percentage}%
          </span>
        )}
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 mt-1 text-right">
        {progress.current} / {progress.total}
      </div>
    </div>
  )
}

interface ProgressOverlayProps {
  progress: OperationProgress
  onCancel?: () => void
}

export function ProgressOverlay({ progress, onCancel }: ProgressOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <h3 className="text-lg font-medium mb-4">Processing...</h3>
        <ProgressBar progress={progress} />
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-4 w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
