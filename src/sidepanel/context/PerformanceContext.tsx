import { createContext, useContext, type ReactNode } from 'react'
import { usePerformanceMode } from '../hooks'

interface PerformanceContextType {
  performanceMode: boolean
}

const PerformanceContext = createContext<PerformanceContextType>({
  performanceMode: false,
})

export function PerformanceProvider({ children }: { children: ReactNode }) {
  // Automatically detect lag using FPS monitoring
  const performanceMode = usePerformanceMode({
    fpsThreshold: 30,    // Enable performance mode when FPS drops below 30
    sampleSize: 20,      // Average over 20 frames
    recoveryDelay: 3000, // Wait 3s before disabling performance mode
  })

  return (
    <PerformanceContext.Provider value={{ performanceMode }}>
      {children}
    </PerformanceContext.Provider>
  )
}

export function usePerformanceContext() {
  return useContext(PerformanceContext)
}
