import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useQueue, type Job, type JobStatus } from '../context'

export function ProcessingQueue() {
  const {
    jobs,
    cancelJob,
    clearCompleted,
    clearAll,
    hasRunningJobs,
    pendingCount,
    runningCount,
  } = useQueue()
  const [isExpanded, setIsExpanded] = useState(false)

  // Only show if there are jobs
  if (jobs.length === 0) return null

  const completedCount = jobs.filter(
    (j) => j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled'
  ).length

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface-950/95 backdrop-blur-xl border-t border-surface-800"
    >
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-900/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              hasRunningJobs
                ? 'bg-brand-500 animate-pulse'
                : completedCount === jobs.length
                ? 'bg-emerald-500'
                : 'bg-surface-500'
            }`}
          />
          <span className="text-sm font-medium text-white">
            Processing Queue
          </span>
          <div className="flex items-center gap-2">
            {runningCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-brand-500/20 text-brand-400">
                {runningCount} running
              </span>
            )}
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-surface-700 text-surface-400">
                {pendingCount} pending
              </span>
            )}
            {completedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400">
                {completedCount} done
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {completedCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                clearCompleted()
              }}
              className="text-xs text-surface-500 hover:text-surface-300 transition-colors"
            >
              Clear done
            </button>
          )}
          <ChevronIcon
            className={`w-5 h-5 text-surface-400 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Expanded job list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="max-h-64 overflow-y-auto border-t border-surface-800">
              {jobs.map((job) => (
                <JobItem key={job.id} job={job} onCancel={cancelJob} />
              ))}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-surface-800 bg-surface-900/50">
              <span className="text-xs text-surface-500">
                {jobs.length} total job{jobs.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={clearAll}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Clear all
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface JobItemProps {
  job: Job
  onCancel: (id: string) => void
}

function JobItem({ job, onCancel }: JobItemProps) {
  const statusConfig: Record<
    JobStatus,
    { icon: JSX.Element; color: string; bg: string }
  > = {
    pending: {
      icon: <ClockIcon className="w-4 h-4" />,
      color: 'text-surface-400',
      bg: 'bg-surface-800',
    },
    running: {
      icon: <SpinnerIcon className="w-4 h-4 animate-spin" />,
      color: 'text-brand-400',
      bg: 'bg-brand-500/20',
    },
    completed: {
      icon: <CheckIcon className="w-4 h-4" />,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/20',
    },
    failed: {
      icon: <XIcon className="w-4 h-4" />,
      color: 'text-red-400',
      bg: 'bg-red-500/20',
    },
    cancelled: {
      icon: <XIcon className="w-4 h-4" />,
      color: 'text-surface-500',
      bg: 'bg-surface-800',
    },
  }

  const config = statusConfig[job.status]
  const canCancel = job.status === 'pending' || job.status === 'running'

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-800/50 last:border-b-0 hover:bg-surface-900/30 transition-colors">
      {/* Status icon */}
      <div className={`p-1.5 rounded-lg ${config.bg} ${config.color}`}>
        {config.icon}
      </div>

      {/* Job info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">
            {job.title}
          </span>
          <span className={`text-xs ${config.color}`}>
            {job.status}
          </span>
        </div>
        {job.description && (
          <p className="text-xs text-surface-500 truncate">{job.description}</p>
        )}
        {job.error && (
          <p className="text-xs text-red-400 truncate">{job.error}</p>
        )}
        {job.progress && (
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 h-1 bg-surface-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all"
                style={{
                  width: `${(job.progress.current / job.progress.total) * 100}%`,
                }}
              />
            </div>
            <span className="text-[10px] text-surface-500">
              {job.progress.current}/{job.progress.total}
            </span>
          </div>
        )}
      </div>

      {/* Cancel button */}
      {canCancel && (
        <button
          onClick={() => onCancel(job.id)}
          className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <XIcon className="w-4 h-4" />
        </button>
      )}

      {/* Timestamp */}
      <span className="text-[10px] text-surface-600 flex-shrink-0">
        {formatTime(job.startedAt || job.createdAt)}
      </span>
    </div>
  )
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Icons
function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
