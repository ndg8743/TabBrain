import type { OperationProgress } from '@/types/domain'
import { setSessionStorage, getSessionStorage, clearSessionStorage } from '@/lib/chrome/storage'

export interface OperationState {
  id: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress?: OperationProgress
  result?: unknown
  error?: string
  startedAt: number
  completedAt?: number
}

const OPERATION_KEY = 'currentOperation'

export async function startOperation(
  type: string,
  id?: string
): Promise<OperationState> {
  const state: OperationState = {
    id: id ?? crypto.randomUUID(),
    type,
    status: 'running',
    startedAt: Date.now(),
  }

  await setSessionStorage(OPERATION_KEY, state)
  return state
}

export async function updateOperationProgress(
  progress: OperationProgress
): Promise<void> {
  const state = await getSessionStorage<OperationState>(OPERATION_KEY)
  if (state) {
    state.progress = progress
    await setSessionStorage(OPERATION_KEY, state)
  }
}

export async function completeOperation(result?: unknown): Promise<void> {
  const state = await getSessionStorage<OperationState>(OPERATION_KEY)
  if (state) {
    state.status = 'completed'
    state.result = result
    state.completedAt = Date.now()
    await setSessionStorage(OPERATION_KEY, state)
  }
}

export async function failOperation(error: string): Promise<void> {
  const state = await getSessionStorage<OperationState>(OPERATION_KEY)
  if (state) {
    state.status = 'failed'
    state.error = error
    state.completedAt = Date.now()
    await setSessionStorage(OPERATION_KEY, state)
  }
}

export async function getOperationState(): Promise<OperationState | undefined> {
  return getSessionStorage<OperationState>(OPERATION_KEY)
}

export async function clearOperationState(): Promise<void> {
  await clearSessionStorage()
}

export async function isOperationRunning(): Promise<boolean> {
  const state = await getOperationState()
  return state?.status === 'running'
}
