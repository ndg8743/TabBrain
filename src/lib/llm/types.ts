export type LLMProvider = 'openai' | 'anthropic' | 'ollama' | 'custom'

export interface LLMConfig {
  provider: LLMProvider
  apiKey?: string
  baseUrl: string
  model: string
  maxContextTokens: number
  temperature: number
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface LLMRequestOptions {
  messages: LLMMessage[]
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface LLMProviderInterface {
  readonly name: string
  readonly config: LLMConfig

  complete(options: LLMRequestOptions): Promise<LLMResponse>
  isConfigured(): boolean
  testConnection(): Promise<boolean>
}

// Response types for specific tasks
export interface CategoryResult {
  i: number // index
  c: string // category
}

export interface TopicResult {
  topic: string
  confidence: number
}

export interface FolderNameResult {
  name: string
}

// Error types
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: LLMErrorCode,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'LLMError'
  }
}

export type LLMErrorCode =
  | 'INVALID_CONFIG'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'INVALID_RESPONSE'
  | 'CONTEXT_TOO_LONG'
  | 'MODEL_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'UNKNOWN'
