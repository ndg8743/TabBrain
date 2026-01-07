import { motion } from 'motion/react'
import { useViewMode } from '../context'

interface ViewModeToggleProps {
  className?: string
}

export function ViewModeToggle({ className = '' }: ViewModeToggleProps) {
  const { compactMode, setCompactMode } = useViewMode()

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs text-surface-400">View:</span>
      <div className="flex bg-surface-800 rounded-lg p-0.5">
        <motion.button
          onClick={() => setCompactMode(false)}
          className={`px-2 py-1 text-xs rounded-md transition-colors ${
            !compactMode
              ? 'bg-surface-700 text-white'
              : 'text-surface-400 hover:text-surface-300'
          }`}
          whileTap={{ scale: 0.95 }}
        >
          <ListIcon className="w-3.5 h-3.5" />
        </motion.button>
        <motion.button
          onClick={() => setCompactMode(true)}
          className={`px-2 py-1 text-xs rounded-md transition-colors ${
            compactMode
              ? 'bg-surface-700 text-white'
              : 'text-surface-400 hover:text-surface-300'
          }`}
          whileTap={{ scale: 0.95 }}
        >
          <CompactIcon className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </div>
  )
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function CompactIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  )
}
