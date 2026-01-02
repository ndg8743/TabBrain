import { BaseLLMProvider } from './provider'
import type { LLMRequestOptions, LLMResponse, LLMMessage } from './types'
import { LLMError } from './types'
import { logger } from '@/lib/utils/logger'

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenAIRequest {
  model: string
  messages: OpenAIMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
  // Note: tools field is intentionally excluded to prevent duplicate tool name errors
  // Some API providers (like Open WebUI) may add tools automatically
}

interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class OpenAICompatibleProvider extends BaseLLMProvider {
  readonly name = 'openai-compatible'

  isConfigured(): boolean {
    return Boolean(this.config.baseUrl && this.config.model)
  }

  async complete(options: LLMRequestOptions): Promise<LLMResponse> {
    const url = this.getCompletionUrl()

    const body: OpenAIRequest = {
      model: this.config.model,
      messages: options.messages.map(this.mapMessage),
      temperature: options.temperature ?? this.config.temperature,
      max_tokens: options.maxTokens ?? 1000,
      stream: false,
      // Explicitly exclude tools to prevent API errors from duplicate tool names
    }

    logger.debug('OpenAI request', { url, model: body.model, messageCount: body.messages.length })

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error(`OpenAI API error ${response.status}: ${errorText.slice(0, 500)}`)

        // Check for duplicate tool names error
        if (errorText.includes('tools') && errorText.includes('unique')) {
          throw new LLMError(
            'Duplicate tool names detected. This may be caused by the API provider automatically adding tools. Check your API provider configuration.',
            'INVALID_CONFIG'
          )
        }

        // Check for model not found (404)
        if (response.status === 404 || errorText.toLowerCase().includes('not found')) {
          throw new LLMError(
            `Model "${this.config.model}" not found. Check that the model name is correct and available on your API provider.`,
            'MODEL_NOT_FOUND'
          )
        }

        // Check for unauthorized (401)
        if (response.status === 401 || errorText.toLowerCase().includes('unauthorized')) {
          throw new LLMError(
            'Unauthorized - check your API key is correct.',
            'UNAUTHORIZED'
          )
        }

        throw new Error(`API error: ${response.status} ${errorText}`)
      }

      const data = await response.json()

      // Handle Ollama response format
      if (this.isOllama()) {
        const ollamaData = data as { message?: { content: string }, eval_count?: number, prompt_eval_count?: number }
        if (!ollamaData.message?.content) {
          throw new LLMError('No response from Ollama model', 'INVALID_RESPONSE')
        }
        logger.debug('Ollama response', { contentLength: ollamaData.message.content.length })
        return {
          content: ollamaData.message.content,
          usage: ollamaData.eval_count ? {
            promptTokens: ollamaData.prompt_eval_count ?? 0,
            completionTokens: ollamaData.eval_count,
            totalTokens: (ollamaData.prompt_eval_count ?? 0) + ollamaData.eval_count,
          } : undefined,
        }
      }

      // Handle OpenAI-compatible response format
      const openaiData = data as OpenAIResponse
      const choice = openaiData.choices?.[0]
      if (!choice) {
        throw new LLMError('No response from model', 'INVALID_RESPONSE')
      }

      logger.debug('OpenAI response', {
        contentLength: choice.message.content.length,
        usage: openaiData.usage,
      })

      return {
        content: choice.message.content,
        usage: openaiData.usage ? {
          promptTokens: openaiData.usage.prompt_tokens,
          completionTokens: openaiData.usage.completion_tokens,
          totalTokens: openaiData.usage.total_tokens,
        } : undefined,
      }
    } catch (error) {
      this.handleError(error)
    }
  }

  async listModels(): Promise<string[]> {
    const url = this.getModelsUrl()
    logger.debug(`Fetching models from: ${url}`)

    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.warn(`Failed to list models (${response.status}): ${errorText.slice(0, 200)}`)
        return []
      }

      const data = await response.json()
      logger.debug('Models response', JSON.stringify(data).slice(0, 500))

      // Handle Ollama's response format (uses 'models' array with 'name' field)
      if (data.models && Array.isArray(data.models)) {
        const models = data.models.map((m: { name?: string; id?: string }) => m.name || m.id || 'unknown')
        logger.debug(`Found ${models.length} Ollama/OpenWebUI models`)
        return models.filter((m: string) => m !== 'unknown')
      }

      // Handle OpenAI-compatible format (uses 'data' array with 'id' field)
      if (data.data && Array.isArray(data.data)) {
        const models = data.data.map((m: { id: string; name?: string }) => m.id || m.name)
        logger.debug(`Found ${models.length} OpenAI-compatible models`)
        return models.filter(Boolean)
      }

      // Handle direct array response (some APIs return this)
      if (Array.isArray(data)) {
        const models = data.map((m: { id?: string; name?: string } | string) => {
          if (typeof m === 'string') return m
          return m.id || m.name || 'unknown'
        })
        logger.debug(`Found ${models.length} models (array format)`)
        return models.filter((m: string) => m !== 'unknown')
      }

      logger.warn('Unknown models response format', JSON.stringify(data).slice(0, 200))
      return []
    } catch (error) {
      logger.error(`Failed to fetch models: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return []
    }
  }

  private isOllama(): boolean {
    const base = this.config.baseUrl.toLowerCase()
    return base.includes('11434') || base.includes('ollama')
  }

  private getCompletionUrl(): string {
    const base = this.config.baseUrl.replace(/\/$/, '')

    // Ollama uses /api/chat for chat completions
    if (this.isOllama()) {
      return `${base}/api/chat`
    }

    // Open WebUI uses /api/chat/completions when URL ends with /api
    if (base.endsWith('/api')) {
      return `${base}/chat/completions`
    }

    // Standard OpenAI-compatible pattern
    if (base.endsWith('/v1')) {
      return `${base}/chat/completions`
    }

    // Default: append /v1/chat/completions
    return `${base}/v1/chat/completions`
  }

  private getModelsUrl(): string {
    const base = this.config.baseUrl.replace(/\/$/, '')

    // Ollama uses /api/tags endpoint
    if (this.isOllama()) {
      return `${base}/api/tags`
    }

    // Open WebUI uses /api/models when URL ends with /api
    if (base.endsWith('/api')) {
      return `${base}/models`
    }

    // Standard OpenAI-compatible pattern
    if (base.endsWith('/v1')) {
      return `${base}/models`
    }

    // Default: append /v1/models
    return `${base}/v1/models`
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    return headers
  }

  private mapMessage(message: LLMMessage): OpenAIMessage {
    return {
      role: message.role,
      content: message.content,
    }
  }
}
