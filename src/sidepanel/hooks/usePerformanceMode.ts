import { useState, useEffect, useRef } from 'react'

/**
 * Monitors frame rate and automatically enables performance mode when lag is detected.
 * Uses requestAnimationFrame to measure actual FPS and switches to reduced animations
 * when frames drop below threshold.
 */
export function usePerformanceMode(options?: {
  fpsThreshold?: number      // FPS below this triggers performance mode (default: 30)
  sampleSize?: number        // Number of frames to average (default: 20)
  recoveryDelay?: number     // Ms to wait before disabling performance mode (default: 3000)
}) {
  const {
    fpsThreshold = 30,
    sampleSize = 20,
    recoveryDelay = 3000,
  } = options ?? {}

  const [performanceMode, setPerformanceMode] = useState(false)
  const frameTimesRef = useRef<number[]>([])
  const lastFrameTimeRef = useRef<number>(performance.now())
  const rafIdRef = useRef<number | null>(null)
  const recoveryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLaggingRef = useRef(false)

  useEffect(() => {
    let isActive = true

    const measureFrame = (currentTime: number) => {
      if (!isActive) return

      const deltaTime = currentTime - lastFrameTimeRef.current
      lastFrameTimeRef.current = currentTime

      // Skip first frame (deltaTime would be huge)
      if (deltaTime < 500) {
        frameTimesRef.current.push(deltaTime)

        // Keep only recent samples
        if (frameTimesRef.current.length > sampleSize) {
          frameTimesRef.current.shift()
        }

        // Calculate average FPS once we have enough samples
        if (frameTimesRef.current.length >= sampleSize) {
          const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length
          const fps = 1000 / avgFrameTime

          if (fps < fpsThreshold) {
            // Lag detected - enable performance mode immediately
            if (!isLaggingRef.current) {
              isLaggingRef.current = true
              setPerformanceMode(true)

              // Clear any pending recovery
              if (recoveryTimeoutRef.current) {
                clearTimeout(recoveryTimeoutRef.current)
                recoveryTimeoutRef.current = null
              }
            }
          } else if (isLaggingRef.current) {
            // Performance recovered - wait before disabling performance mode
            if (!recoveryTimeoutRef.current) {
              recoveryTimeoutRef.current = setTimeout(() => {
                isLaggingRef.current = false
                setPerformanceMode(false)
                recoveryTimeoutRef.current = null
              }, recoveryDelay)
            }
          }
        }
      }

      rafIdRef.current = requestAnimationFrame(measureFrame)
    }

    // Start measuring after a short delay to let initial render complete
    const startTimeout = setTimeout(() => {
      rafIdRef.current = requestAnimationFrame(measureFrame)
    }, 500)

    return () => {
      isActive = false
      clearTimeout(startTimeout)
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current)
      }
    }
  }, [fpsThreshold, sampleSize, recoveryDelay])

  return performanceMode
}
