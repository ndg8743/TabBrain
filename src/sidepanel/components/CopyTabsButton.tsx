import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { TabInfo } from '@/types/domain'
import { copyTabsToClipboard, type CopyFormat, getFormatLabel } from '@/lib/utils/clipboard'
import { useToast } from './Toast'

interface CopyTabsButtonProps {
  tabs: TabInfo[]
  label?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
  showCount?: boolean
  className?: string
}

const FORMATS: CopyFormat[] = ['urls', 'titles-urls', 'markdown']

export function CopyTabsButton({
  tabs,
  label = 'Copy',
  variant = 'secondary',
  size = 'sm',
  showCount = true,
  className = '',
}: CopyTabsButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const toast = useToast()

  const handleCopy = async (format: CopyFormat) => {
    const success = await copyTabsToClipboard(tabs, format)
    setIsOpen(false)

    if (success) {
      toast.success(
        'Copied to clipboard',
        `${tabs.length} tab${tabs.length !== 1 ? 's' : ''} copied as ${getFormatLabel(format).toLowerCase()}`
      )
    } else {
      toast.error('Copy failed', 'Could not copy to clipboard')
    }
  }

  const baseStyles = {
    primary:
      'bg-brand-500 hover:bg-brand-600 text-white border-brand-500/50',
    secondary:
      'bg-surface-800 hover:bg-surface-700 text-surface-200 border-surface-700',
    ghost:
      'bg-transparent hover:bg-surface-800 text-surface-300 border-transparent',
  }

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3 py-2 text-sm gap-2',
  }

  return (
    <div className={`relative ${className}`}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center rounded-lg border transition-colors ${baseStyles[variant]} ${sizeStyles[size]}`}
        whileTap={{ scale: 0.97 }}
      >
        <CopyIcon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>{label}</span>
        {showCount && (
          <span className="opacity-60">({tabs.length})</span>
        )}
        <ChevronIcon
          className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full mb-1 right-0 z-50 min-w-[140px] py-1 rounded-lg bg-surface-900 border border-surface-700 shadow-xl"
            >
              {FORMATS.map((format) => (
                <button
                  key={format}
                  onClick={() => handleCopy(format)}
                  className="w-full px-3 py-2 text-left text-xs text-surface-300 hover:bg-surface-800 hover:text-white transition-colors"
                >
                  {getFormatLabel(format)}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  )
}
