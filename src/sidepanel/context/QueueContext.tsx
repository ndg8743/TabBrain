import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export type JobType =
  | 'detect-topic'
  | 'categorize-tabs'
  | 'smart-categorize'
  | 'create-groups'
  | 'chat'
  | 'analyze-bookmarks'

export interface Job {
  id: string
  type: JobType
  status: JobStatus
  title: string
  description?: string
  progress?: { current: number; total: number }
  result?: unknown
  error?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}

interface QueueContextType {
  jobs: Job[]
  addJob: (type: JobType, title: string, description?: string) => string
  updateJob: (id: string, updates: Partial<Job>) => void
  startJob: (id: string) => void
  completeJob: (id: string, result?: unknown) => void
  failJob: (id: string, error: string) => void
  cancelJob: (id: string) => void
  clearCompleted: () => void
  clearAll: () => void
  getJob: (id: string) => Job | undefined
  hasRunningJobs: boolean
  pendingCount: number
  runningCount: number
}

const QueueContext = createContext<QueueContextType | null>(null)

export function useQueue() {
  const context = useContext(QueueContext)
  if (!context) {
    throw new Error('useQueue must be used within a QueueProvider')
  }
  return context
}

export function QueueProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([])
  const jobIdCounter = useRef(0)

  const addJob = useCallback((type: JobType, title: string, description?: string): string => {
    const id = `job-${++jobIdCounter.current}-${Date.now()}`
    const newJob: Job = {
      id,
      type,
      status: 'pending',
      title,
      description,
      createdAt: new Date(),
    }
    setJobs((prev) => [...prev, newJob])
    return id
  }, [])

  const updateJob = useCallback((id: string, updates: Partial<Job>) => {
    setJobs((prev) =>
      prev.map((job) => (job.id === id ? { ...job, ...updates } : job))
    )
  }, [])

  const startJob = useCallback((id: string) => {
    updateJob(id, { status: 'running', startedAt: new Date() })
  }, [updateJob])

  const completeJob = useCallback((id: string, result?: unknown) => {
    updateJob(id, {
      status: 'completed',
      result,
      completedAt: new Date(),
    })
  }, [updateJob])

  const failJob = useCallback((id: string, error: string) => {
    updateJob(id, {
      status: 'failed',
      error,
      completedAt: new Date(),
    })
  }, [updateJob])

  const cancelJob = useCallback((id: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === id && (job.status === 'pending' || job.status === 'running')
          ? { ...job, status: 'cancelled', completedAt: new Date() }
          : job
      )
    )
  }, [])

  const clearCompleted = useCallback(() => {
    setJobs((prev) =>
      prev.filter(
        (job) =>
          job.status !== 'completed' &&
          job.status !== 'failed' &&
          job.status !== 'cancelled'
      )
    )
  }, [])

  const clearAll = useCallback(() => {
    setJobs([])
  }, [])

  const getJob = useCallback(
    (id: string) => jobs.find((job) => job.id === id),
    [jobs]
  )

  const hasRunningJobs = jobs.some((job) => job.status === 'running')
  const pendingCount = jobs.filter((job) => job.status === 'pending').length
  const runningCount = jobs.filter((job) => job.status === 'running').length

  return (
    <QueueContext.Provider
      value={{
        jobs,
        addJob,
        updateJob,
        startJob,
        completeJob,
        failJob,
        cancelJob,
        clearCompleted,
        clearAll,
        getJob,
        hasRunningJobs,
        pendingCount,
        runningCount,
      }}
    >
      {children}
    </QueueContext.Provider>
  )
}
