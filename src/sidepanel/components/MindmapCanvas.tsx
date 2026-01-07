import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import { motion } from 'motion/react'

interface MindmapCanvasProps {
  children: ReactNode
  width?: number
  height?: number
  minZoom?: number
  maxZoom?: number
  className?: string
}

interface Transform {
  x: number
  y: number
  scale: number
}

export function MindmapCanvas({
  children,
  width = 2000,
  height = 2000,
  minZoom = 0.25,
  maxZoom = 2,
  className = '',
}: MindmapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Center the view on mount
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setTransform({
        x: (rect.width - width) / 2,
        y: (rect.height - height) / 2,
        scale: 0.8,
      })
    }
  }, [width, height])

  // Handle mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.min(maxZoom, Math.max(minZoom, transform.scale * delta))

      // Zoom toward cursor position
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const scaleChange = newScale / transform.scale
      const newX = mouseX - (mouseX - transform.x) * scaleChange
      const newY = mouseY - (mouseY - transform.y) * scaleChange

      setTransform({ x: newX, y: newY, scale: newScale })
    },
    [transform, minZoom, maxZoom]
  )

  // Handle pan start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return // Only left click
      setIsDragging(true)
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y })
    },
    [transform]
  )

  // Handle pan move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }))
    },
    [isDragging, dragStart]
  )

  // Handle pan end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Handle touch events for mobile
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0]
        if (!touch) return
        setIsDragging(true)
        setDragStart({ x: touch.clientX - transform.x, y: touch.clientY - transform.y })
      }
    },
    [transform]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return
      const touch = e.touches[0]
      if (!touch) return
      setTransform((prev) => ({
        ...prev,
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      }))
    },
    [isDragging, dragStart]
  )

  // Zoom controls
  const zoomIn = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(maxZoom, prev.scale * 1.2),
    }))
  }

  const zoomOut = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(minZoom, prev.scale / 1.2),
    }))
  }

  const resetView = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setTransform({
        x: (rect.width - width) / 2,
        y: (rect.height - height) / 2,
        scale: 0.8,
      })
    }
  }

  const zoomPercent = Math.round(transform.scale * 100)

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Canvas container */}
      <div
        ref={containerRef}
        className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      >
        {/* Transformed content */}
        <div
          style={{
            width,
            height,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          {children}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl glass-card">
          <motion.button
            onClick={zoomOut}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
            title="Zoom out"
          >
            <MinusIcon className="w-4 h-4" />
          </motion.button>

          <span className="px-2 text-xs font-mono text-surface-400 min-w-[3rem] text-center">
            {zoomPercent}%
          </span>

          <motion.button
            onClick={zoomIn}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
            title="Zoom in"
          >
            <PlusIcon className="w-4 h-4" />
          </motion.button>
        </div>

        <motion.button
          onClick={resetView}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-xl glass-card text-surface-400 hover:text-white transition-colors"
          title="Reset view"
        >
          <ResetIcon className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 left-4 text-[10px] text-surface-600 pointer-events-none">
        Scroll to zoom • Drag to pan
      </div>
    </div>
  )
}

// Icons
function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function ResetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}
