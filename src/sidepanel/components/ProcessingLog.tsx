import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'

export interface LogEntry {
  id: string
  timestamp: Date
  type: 'info' | 'success' | 'error' | 'response'
  message: string
  details?: string
}

interface ProcessingLogProps {
  logs: LogEntry[]
  title?: string
  maxHeight?: string
}

export function ProcessingLog({ logs, title = 'Processing Log', maxHeight = '200px' }: ProcessingLogProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (logs.length === 0) return null

  const latestLog = logs[logs.length - 1]
  const hasErrors = logs.some(log => log.type === 'error')

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-surface-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            hasErrors ? 'bg-red-500' : latestLog?.type === 'success' ? 'bg-green-500' : 'bg-brand-500 animate-pulse'
          }`} />
          <span className="text-sm font-medium text-white">{title}</span>
          <span className="text-xs text-surface-500">({logs.length} entries)</span>
        </div>
        <ChevronIcon className={`w-4 h-4 text-surface-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="border-t border-surface-800 overflow-y-auto"
              style={{ maxHeight }}
            >
              {logs.map((log) => (
                <LogEntryItem key={log.id} log={log} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function LogEntryItem({ log }: { log: LogEntry }) {
  const [showDetails, setShowDetails] = useState(false)

  const typeStyles = {
    info: 'text-surface-400',
    success: 'text-green-400',
    error: 'text-red-400',
    response: 'text-brand-400',
  }

  const typeIcons = {
    info: '○',
    success: '✓',
    error: '✕',
    response: '◈',
  }

  return (
    <div className="px-3 py-2 border-b border-surface-800/50 last:border-b-0">
      <div className="flex items-start gap-2">
        <span className={`text-xs ${typeStyles[log.type]}`}>{typeIcons[log.type]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs ${typeStyles[log.type]} truncate`}>{log.message}</p>
            <span className="text-[10px] text-surface-600 flex-shrink-0">
              {log.timestamp.toLocaleTimeString()}
            </span>
          </div>
          {log.details && (
            <>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-[10px] text-surface-500 hover:text-surface-400 mt-1"
              >
                {showDetails ? 'Hide details' : 'Show details'}
              </button>
              {showDetails && (
                <pre className="mt-1 p-2 bg-surface-900 rounded text-[10px] text-surface-400 overflow-x-auto whitespace-pre-wrap break-all">
                  {log.details}
                </pre>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}
