import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface ViewModeContextType {
  compactMode: boolean
  setCompactMode: (value: boolean) => void
}

const ViewModeContext = createContext<ViewModeContextType>({
  compactMode: false,
  setCompactMode: () => {},
})

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [compactMode, setCompactModeState] = useState(false)

  // Load setting from storage on mount
  useEffect(() => {
    chrome.storage.local.get(['viewMode'], (result) => {
      if (result.viewMode?.compactMode !== undefined) {
        setCompactModeState(result.viewMode.compactMode)
      }
    })
  }, [])

  // Save setting to storage when it changes
  const setCompactMode = (value: boolean) => {
    setCompactModeState(value)
    chrome.storage.local.set({ viewMode: { compactMode: value } })
  }

  return (
    <ViewModeContext.Provider value={{ compactMode, setCompactMode }}>
      {children}
    </ViewModeContext.Provider>
  )
}

export function useViewMode() {
  return useContext(ViewModeContext)
}
