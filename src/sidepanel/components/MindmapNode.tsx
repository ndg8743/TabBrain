import { motion } from 'motion/react'
import type { TabInfo, WindowInfo } from '@/types/domain'

// ============================================
// ROOT NODE (Center)
// ============================================

interface RootNodeProps {
  tabCount: number
  windowCount: number
  x: number
  y: number
  isHighlighted?: boolean
  onClick?: () => void
}

export function RootNode({ tabCount, windowCount, x, y, isHighlighted, onClick }: RootNodeProps) {
  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      {/* Glow effect */}
      <circle
        cx={x}
        cy={y}
        r={60}
        fill="url(#rootGlow)"
        className={`transition-opacity duration-300 ${isHighlighted ? 'opacity-100' : 'opacity-50'}`}
      />

      {/* Main circle */}
      <circle
        cx={x}
        cy={y}
        r={45}
        fill="url(#rootGradient)"
        stroke="rgba(139, 92, 246, 0.5)"
        strokeWidth={2}
        className="drop-shadow-lg"
      />

      {/* Inner ring */}
      <circle
        cx={x}
        cy={y}
        r={38}
        fill="none"
        stroke="rgba(255, 255, 255, 0.2)"
        strokeWidth={1}
      />

      {/* Brain icon */}
      <g transform={`translate(${x - 12}, ${y - 18})`}>
        <path
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
          stroke="white"
          strokeWidth={1.5}
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth={1.5} />
      </g>

      {/* Text */}
      <text
        x={x}
        y={y + 65}
        textAnchor="middle"
        className="text-xs font-medium fill-white"
      >
        {windowCount} windows
      </text>
      <text
        x={x}
        y={y + 80}
        textAnchor="middle"
        className="text-[10px] fill-surface-400"
      >
        {tabCount} tabs
      </text>
    </motion.g>
  )
}

// ============================================
// WINDOW NODE
// ============================================

interface WindowNodeProps {
  window: WindowInfo
  x: number
  y: number
  isExpanded?: boolean
  isHighlighted?: boolean
  isSelected?: boolean
  onClick?: () => void
  onDoubleClick?: () => void
}

const WINDOW_COLORS = [
  { gradient: 'windowGradient1', glow: 'rgba(236, 72, 153, 0.3)', stroke: 'rgba(236, 72, 153, 0.5)' },
  { gradient: 'windowGradient2', glow: 'rgba(59, 130, 246, 0.3)', stroke: 'rgba(59, 130, 246, 0.5)' },
  { gradient: 'windowGradient3', glow: 'rgba(16, 185, 129, 0.3)', stroke: 'rgba(16, 185, 129, 0.5)' },
  { gradient: 'windowGradient4', glow: 'rgba(245, 158, 11, 0.3)', stroke: 'rgba(245, 158, 11, 0.5)' },
  { gradient: 'windowGradient5', glow: 'rgba(139, 92, 246, 0.3)', stroke: 'rgba(139, 92, 246, 0.5)' },
]

export function WindowNode({
  window,
  x,
  y,
  isExpanded,
  isHighlighted,
  isSelected,
  onClick,
  onDoubleClick,
}: WindowNodeProps) {
  const colorIndex = window.id % WINDOW_COLORS.length
  const color = WINDOW_COLORS[colorIndex] ?? WINDOW_COLORS[0]!
  const tabCount = window.tabs.length
  const label = window.topic || `Window ${window.id}`
  const truncatedLabel = label.length > 15 ? label.slice(0, 15) + '...' : label

  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: isSelected ? 1.1 : 1,
        opacity: isHighlighted === false ? 0.4 : 1
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {/* Glow effect */}
      <ellipse
        cx={x}
        cy={y}
        rx={50}
        ry={35}
        fill={color.glow}
        className={`transition-opacity duration-300 ${isHighlighted || isSelected ? 'opacity-100' : 'opacity-40'}`}
        filter="url(#blur)"
      />

      {/* Main shape */}
      <ellipse
        cx={x}
        cy={y}
        rx={40}
        ry={28}
        fill={`url(#${color.gradient})`}
        stroke={isSelected ? 'white' : color.stroke}
        strokeWidth={isSelected ? 2 : 1.5}
        className="drop-shadow-md"
      />

      {/* Current window indicator */}
      {window.focused && (
        <circle
          cx={x + 35}
          cy={y - 20}
          r={6}
          fill="#22c55e"
          stroke="rgba(34, 197, 94, 0.5)"
          strokeWidth={2}
        />
      )}

      {/* Window icon */}
      <g transform={`translate(${x - 8}, ${y - 8})`}>
        <rect x="0" y="0" width="16" height="3" rx="1" fill="rgba(255,255,255,0.8)" />
        <rect x="0" y="5" width="7" height="11" rx="1" fill="rgba(255,255,255,0.6)" />
        <rect x="9" y="5" width="7" height="11" rx="1" fill="rgba(255,255,255,0.6)" />
      </g>

      {/* Label */}
      <text
        x={x}
        y={y + 45}
        textAnchor="middle"
        className="text-[11px] font-medium fill-white"
      >
        {truncatedLabel}
      </text>

      {/* Tab count badge */}
      <g transform={`translate(${x + 25}, ${y + 35})`}>
        <rect
          x={-12}
          y={-8}
          width={24}
          height={16}
          rx={8}
          fill="rgba(0,0,0,0.4)"
        />
        <text
          x={0}
          y={4}
          textAnchor="middle"
          className="text-[9px] font-medium fill-surface-300"
        >
          {tabCount}
        </text>
      </g>

      {/* Expand indicator */}
      {tabCount > 0 && (
        <g transform={`translate(${x}, ${y + 60})`}>
          <motion.path
            d={isExpanded ? "M-4 0L0 -4L4 0" : "M-4 -2L0 2L4 -2"}
            stroke="rgba(255,255,255,0.5)"
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={{ y: isExpanded ? 0 : [0, 2, 0] }}
            transition={{ repeat: isExpanded ? 0 : Infinity, duration: 1.5 }}
          />
        </g>
      )}
    </motion.g>
  )
}

// ============================================
// TAB NODE
// ============================================

interface TabNodeProps {
  tab: TabInfo
  x: number
  y: number
  isHighlighted?: boolean
  isSelected?: boolean
  onClick?: () => void
  onDoubleClick?: () => void
}

export function TabNode({
  tab,
  x,
  y,
  isHighlighted,
  isSelected,
  onClick,
  onDoubleClick,
}: TabNodeProps) {
  const domain = getDomain(tab.url)
  const title = tab.title || 'Untitled'
  const truncatedTitle = title.length > 20 ? title.slice(0, 20) + '...' : title

  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: isSelected ? 1.1 : 1,
        opacity: isHighlighted === false ? 0.3 : 1
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {/* Selection ring */}
      {isSelected && (
        <circle
          cx={x}
          cy={y}
          r={22}
          fill="none"
          stroke="rgba(139, 92, 246, 0.8)"
          strokeWidth={2}
          strokeDasharray="4 2"
        />
      )}

      {/* Main circle */}
      <circle
        cx={x}
        cy={y}
        r={16}
        fill={isHighlighted ? 'rgba(139, 92, 246, 0.3)' : 'rgba(30, 30, 40, 0.9)'}
        stroke={isSelected ? 'rgba(139, 92, 246, 0.8)' : 'rgba(60, 60, 80, 0.8)'}
        strokeWidth={1.5}
        className="transition-all duration-200"
      />

      {/* Favicon or placeholder */}
      {tab.favIconUrl ? (
        <image
          href={tab.favIconUrl}
          x={x - 8}
          y={y - 8}
          width={16}
          height={16}
          clipPath="url(#faviconClip)"
          style={{ borderRadius: '4px' }}
        />
      ) : (
        <circle
          cx={x}
          cy={y}
          r={6}
          fill="rgba(100, 100, 120, 0.8)"
        />
      )}

      {/* Pinned indicator */}
      {tab.pinned && (
        <circle
          cx={x + 12}
          cy={y - 12}
          r={5}
          fill="#f59e0b"
          stroke="rgba(245, 158, 11, 0.5)"
          strokeWidth={1}
        />
      )}

      {/* Title tooltip on hover - using foreignObject for text wrapping */}
      <text
        x={x}
        y={y + 28}
        textAnchor="middle"
        className="text-[9px] fill-surface-400 pointer-events-none"
      >
        {truncatedTitle}
      </text>

      {/* Domain */}
      <text
        x={x}
        y={y + 38}
        textAnchor="middle"
        className="text-[8px] fill-surface-600 pointer-events-none"
      >
        {domain}
      </text>
    </motion.g>
  )
}

// ============================================
// CONNECTION LINE
// ============================================

interface ConnectionLineProps {
  x1: number
  y1: number
  x2: number
  y2: number
  isHighlighted?: boolean
  type?: 'root-window' | 'window-tab'
}

export function ConnectionLine({
  x1,
  y1,
  x2,
  y2,
  isHighlighted,
  type = 'window-tab',
}: ConnectionLineProps) {
  // Calculate control points for curved line
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.sqrt(dx * dx + dy * dy)

  // Curve the line perpendicular to its direction
  const curveFactor = type === 'root-window' ? 0.2 : 0.15
  const cx = midX + (dy / dist) * dist * curveFactor
  const cy = midY - (dx / dist) * dist * curveFactor

  const pathD = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`

  return (
    <motion.path
      d={pathD}
      fill="none"
      stroke={type === 'root-window' ? 'url(#lineGradient)' : 'rgba(80, 80, 100, 0.4)'}
      strokeWidth={type === 'root-window' ? 2 : 1}
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{
        pathLength: 1,
        opacity: isHighlighted === false ? 0.2 : (type === 'root-window' ? 0.8 : 0.5)
      }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    />
  )
}

// ============================================
// SVG DEFINITIONS (Gradients, Filters)
// ============================================

export function MindmapDefs() {
  return (
    <defs>
      {/* Root node gradient */}
      <radialGradient id="rootGradient" cx="30%" cy="30%">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#7c3aed" />
      </radialGradient>

      <radialGradient id="rootGlow" cx="50%" cy="50%">
        <stop offset="0%" stopColor="rgba(139, 92, 246, 0.4)" />
        <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
      </radialGradient>

      {/* Window gradients */}
      <linearGradient id="windowGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ec4899" />
        <stop offset="100%" stopColor="#db2777" />
      </linearGradient>

      <linearGradient id="windowGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>

      <linearGradient id="windowGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>

      <linearGradient id="windowGradient4" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>

      <linearGradient id="windowGradient5" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>

      {/* Line gradient */}
      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="rgba(139, 92, 246, 0.8)" />
        <stop offset="100%" stopColor="rgba(139, 92, 246, 0.3)" />
      </linearGradient>

      {/* Blur filter */}
      <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
      </filter>

      {/* Favicon clip path */}
      <clipPath id="faviconClip">
        <circle cx="0" cy="0" r="8" />
      </clipPath>
    </defs>
  )
}

// ============================================
// HELPERS
// ============================================

function getDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, '').slice(0, 15)
  } catch {
    return ''
  }
}
