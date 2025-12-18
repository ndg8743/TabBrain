import type { ReactNode } from 'react'

interface ActionCardProps {
  title: string
  description: string
  icon: ReactNode
  badge?: number | string
  onClick: () => void
  disabled?: boolean
  loading?: boolean
}

export function ActionCard({
  title,
  description,
  icon,
  badge,
  onClick,
  disabled = false,
  loading = false,
}: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        w-full p-4 text-left rounded-lg transition-colors
        ${disabled
          ? 'bg-gray-100 dark:bg-gray-800 opacity-50 cursor-not-allowed'
          : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`
          p-2 rounded-lg
          ${loading ? 'animate-pulse' : ''}
          bg-primary-100 dark:bg-primary-900 text-primary-600
        `}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{title}</h3>
            {badge !== undefined && (
              <span className="px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full">
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        </div>
        {loading && (
          <div className="flex-shrink-0">
            <Spinner />
          </div>
        )}
      </div>
    </button>
  )
}

function Spinner() {
  return (
    <svg
      className="w-5 h-5 animate-spin text-primary-600"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
