import type { LLMConfig, LLMProviderInterface, LLMRequestOptions, LLMResponse } from './types'
import { LLMError } from './types'
import { logger } from '@/lib/utils/logger'

export abstract class BaseLLMProvider implements LLMProviderInterface {
  abstract readonly name: string

  constructor(public readonly config: LLMConfig) {}

  abstract complete(options: LLMRequestOptions): Promise<LLMResponse>

  isConfigured(): boolean {
    return Boolean(this.config.baseUrl && this.config.model)
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.complete({
        messages: [
          { role: 'user', content: 'Say "ok" and nothing else.' },
        ],
        maxTokens: 10,
      })
      return response.content.toLowerCase().includes('ok')
    } catch (error) {
      logger.error('Connection test failed', error)
      return false
    }
  }

  protected handleError(error: unknown): never {
    if (error instanceof LLMError) {
      throw error
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase()

      if (message.includes('rate limit') || message.includes('429')) {
        throw new LLMError('Rate limited', 'RATE_LIMITED', error)
      }

      if (message.includes('unauthorized') || message.includes('401')) {
        throw new LLMError('Unauthorized - check API key', 'UNAUTHORIZED', error)
      }

      if (message.includes('not found') || message.includes('404')) {
        throw new LLMError('Model not found', 'MODEL_NOT_FOUND', error)
      }

      if (message.includes('context') || message.includes('token')) {
        throw new LLMError('Context too long', 'CONTEXT_TOO_LONG', error)
      }

      if (message.includes('network') || message.includes('fetch')) {
        throw new LLMError('Network error', 'NETWORK_ERROR', error)
      }

      throw new LLMError(error.message, 'UNKNOWN', error)
    }

    throw new LLMError('Unknown error', 'UNKNOWN', error)
  }
}
