import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MindmapCanvas } from '../components/MindmapCanvas'
import {
  RootNode,
  WindowNode,
  TabNode,
  ConnectionLine,
  MindmapDefs,
} from '../components/MindmapNode'
import { useWindows, useTabs } from '../hooks'
import type { TabInfo, WindowInfo } from '@/types/domain'

interface TabMindmapProps {
  onBack: () => void
}

// Layout configuration
const CANVAS_SIZE = 2000
const CENTER = CANVAS_SIZE / 2
const WINDOW_RADIUS = 250 // Distance from center to windows
const TAB_RADIUS = 120 // Distance from window to tabs
const MAX_VISIBLE_TABS = 12 // Max tabs to show per window when expanded

interface LayoutNode {
  id: string
  type: 'root' | 'window' | 'tab'
  x: number
  y: number
  data?: WindowInfo | TabInfo
  parentId?: string
}

export function TabMindmap({ onBack }: TabMindmapProps) {
  const { windows, loading } = useWindows()
  const { tabs } = useTabs()
  const [expandedWindows, setExpandedWindows] = useState<Set<number>>(new Set())
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  // Reserved for future hover interactions
  const [_hoveredNode, _setHoveredNode] = useState<string | null>(null)

  // Calculate layout positions
  const layout = useMemo(() => {
    const nodes: LayoutNode[] = []
    const connections: Array<{ from: string; to: string; type: 'root-window' | 'window-tab' }> = []

    // Root node at center
    nodes.push({
      id: 'root',
      type: 'root',
      x: CENTER,
      y: CENTER,
    })

    // Position windows in a circle around the root
    const windowCount = windows.length
    windows.forEach((window, index) => {
      const angle = (index / windowCount) * 2 * Math.PI - Math.PI / 2
      const x = CENTER + Math.cos(angle) * WINDOW_RADIUS
      const y = CENTER + Math.sin(angle) * WINDOW_RADIUS

      nodes.push({
        id: `window-${window.id}`,
        type: 'window',
        x,
        y,
        data: window,
        parentId: 'root',
      })

      connections.push({
        from: 'root',
        to: `window-${window.id}`,
        type: 'root-window',
      })

      // Position tabs around expanded windows
      if (expandedWindows.has(window.id)) {
        const visibleTabs = window.tabs.slice(0, MAX_VISIBLE_TABS)
        const tabCount = visibleTabs.length
        const tabAngleStart = angle - Math.PI / 3
        const tabAngleEnd = angle + Math.PI / 3
        const tabAngleRange = tabAngleEnd - tabAngleStart

        visibleTabs.forEach((tab, tabIndex) => {
          const tabAngle = tabAngleStart + (tabIndex / Math.max(tabCount - 1, 1)) * tabAngleRange
          const tabX = x + Math.cos(tabAngle) * TAB_RADIUS
          const tabY = y + Math.sin(tabAngle) * TAB_RADIUS

          nodes.push({
            id: `tab-${tab.id}`,
            type: 'tab',
            x: tabX,
            y: tabY,
            data: tab,
            parentId: `window-${window.id}`,
          })

          connections.push({
            from: `window-${window.id}`,
            to: `tab-${tab.id}`,
            type: 'window-tab',
          })
        })
      }
    })

    return { nodes, connections }
  }, [windows, expandedWindows])

  // Search filtering
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return null

    const query = searchQuery.toLowerCase()
    const matches = new Set<string>()

    // Search through all tabs
    tabs.forEach((tab) => {
      if (
        tab.title?.toLowerCase().includes(query) ||
        tab.url?.toLowerCase().includes(query)
      ) {
        matches.add(`tab-${tab.id}`)
        matches.add(`window-${tab.windowId}`)
      }
    })

    // Search through windows
    windows.forEach((window) => {
      if (window.topic?.toLowerCase().includes(query)) {
        matches.add(`window-${window.id}`)
      }
    })

    return matches
  }, [searchQuery, tabs, windows])

  // Handlers
  const toggleWindowExpand = useCallback((windowId: number) => {
    setExpandedWindows((prev) => {
      const next = new Set(prev)
      if (next.has(windowId)) {
        next.delete(windowId)
      } else {
        next.add(windowId)
      }
      return next
    })
  }, [])

  const toggleNodeSelection = useCallback((nodeId: string) => {
    setSelectedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  const handleTabDoubleClick = useCallback((tab: TabInfo) => {
    // Focus the tab in Chrome
    chrome.tabs.update(tab.id, { active: true })
    chrome.windows.update(tab.windowId, { focused: true })
  }, [])

  const handleWindowDoubleClick = useCallback((window: WindowInfo) => {
    // Focus the window
    chrome.windows.update(window.id, { focused: true })
  }, [])

  const isNodeHighlighted = useCallback(
    (nodeId: string) => {
      if (!searchMatches) return undefined
      return searchMatches.has(nodeId)
    },
    [searchMatches]
  )

  const clearSearch = () => {
    setSearchQuery('')
  }

  const expandAll = () => {
    setExpandedWindows(new Set(windows.map((w) => w.id)))
  }

  const collapseAll = () => {
    setExpandedWindows(new Set())
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header onBack={onBack} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand-500/20 to-cyan-500/20 flex items-center justify-center animate-pulse">
              <MindmapIcon className="w-6 h-6 text-brand-400" />
            </div>
            <p className="text-sm text-surface-400">Loading mindmap...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header onBack={onBack} />

      {/* Search and Controls */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-1 mb-3 space-y-2"
      >
        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tabs..."
            className="w-full pl-9 pr-8 py-2 text-sm rounded-xl bg-surface-800 border border-surface-700 text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-surface-500 hover:text-white"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Stats and actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="badge-info text-[10px]">
              {windows.length} windows
            </span>
            <span className="badge-neutral text-[10px]">
              {tabs.length} tabs
            </span>
            {searchMatches && (
              <span className="badge-brand text-[10px]">
                {searchMatches.size} matches
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={expandAll}
              className="px-2 py-1 text-[10px] rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
            >
              Expand all
            </button>
            <button
              onClick={collapseAll}
              className="px-2 py-1 text-[10px] rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
            >
              Collapse
            </button>
          </div>
        </div>
      </motion.div>

      {/* Mindmap Canvas */}
      <div className="flex-1 rounded-xl overflow-hidden border border-surface-800 bg-surface-950">
        <MindmapCanvas width={CANVAS_SIZE} height={CANVAS_SIZE} className="w-full h-full">
          <svg width={CANVAS_SIZE} height={CANVAS_SIZE} className="select-none">
            <MindmapDefs />

            {/* Background pattern */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1" fill="rgba(60, 60, 80, 0.3)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Connections (rendered first, behind nodes) */}
            <g className="connections">
              {layout.connections.map((conn) => {
                const fromNode = layout.nodes.find((n) => n.id === conn.from)
                const toNode = layout.nodes.find((n) => n.id === conn.to)
                if (!fromNode || !toNode) return null

                const isHighlighted =
                  searchMatches === null ||
                  (searchMatches.has(conn.from) && searchMatches.has(conn.to))

                return (
                  <ConnectionLine
                    key={`${conn.from}-${conn.to}`}
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    type={conn.type}
                    isHighlighted={isHighlighted}
                  />
                )
              })}
            </g>

            {/* Tab nodes */}
            <g className="tab-nodes">
              <AnimatePresence>
                {layout.nodes
                  .filter((n) => n.type === 'tab')
                  .map((node) => (
                    <TabNode
                      key={node.id}
                      tab={node.data as TabInfo}
                      x={node.x}
                      y={node.y}
                      isHighlighted={isNodeHighlighted(node.id)}
                      isSelected={selectedNodes.has(node.id)}
                      onClick={() => toggleNodeSelection(node.id)}
                      onDoubleClick={() => handleTabDoubleClick(node.data as TabInfo)}
                    />
                  ))}
              </AnimatePresence>
            </g>

            {/* Window nodes */}
            <g className="window-nodes">
              {layout.nodes
                .filter((n) => n.type === 'window')
                .map((node) => {
                  const window = node.data as WindowInfo
                  return (
                    <WindowNode
                      key={node.id}
                      window={window}
                      x={node.x}
                      y={node.y}
                      isExpanded={expandedWindows.has(window.id)}
                      isHighlighted={isNodeHighlighted(node.id)}
                      isSelected={selectedNodes.has(node.id)}
                      onClick={() => toggleWindowExpand(window.id)}
                      onDoubleClick={() => handleWindowDoubleClick(window)}
                    />
                  )
                })}
            </g>

            {/* Root node */}
            <g className="root-node">
              {layout.nodes
                .filter((n) => n.type === 'root')
                .map((node) => (
                  <RootNode
                    key={node.id}
                    tabCount={tabs.length}
                    windowCount={windows.length}
                    x={node.x}
                    y={node.y}
                    isHighlighted={!searchMatches || searchMatches.size > 0}
                  />
                ))}
            </g>
          </svg>
        </MindmapCanvas>
      </div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-2 flex items-center justify-center gap-4 text-[10px] text-surface-500"
      >
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-brand-500" />
          Click to expand
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Double-click to focus
        </span>
      </motion.div>
    </div>
  )
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 mb-4"
    >
      <motion.button
        onClick={onBack}
        whileHover={{ scale: 1.05, x: -2 }}
        whileTap={{ scale: 0.95 }}
        className="btn-icon"
      >
        <BackIcon />
      </motion.button>
      <div>
        <h2 className="font-display font-semibold text-lg text-white">Tab Mindmap</h2>
        <p className="text-sm text-surface-500">Visualize your browsing</p>
      </div>
    </motion.div>
  )
}

// Icons
function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function MindmapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" strokeWidth={2} />
      <circle cx="4" cy="6" r="2" strokeWidth={2} />
      <circle cx="20" cy="6" r="2" strokeWidth={2} />
      <circle cx="4" cy="18" r="2" strokeWidth={2} />
      <circle cx="20" cy="18" r="2" strokeWidth={2} />
      <path strokeLinecap="round" strokeWidth={2} d="M9 10l-3-2M15 10l3-2M9 14l-3 2M15 14l3 2" />
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

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
