import { useState, useEffect } from 'react'

type Provider = 'openai' | 'anthropic' | 'ollama' | 'custom'

interface ProviderConfig {
  provider: Provider
  apiKey: string
  baseUrl: string
  model: string
  maxContextTokens: number
  temperature: number
}

const DEFAULT_CONFIG: ProviderConfig = {
  provider: 'ollama',
  apiKey: '',
  baseUrl: 'http://localhost:11434',
  model: 'llama3.1',
  maxContextTokens: 8000,
  temperature: 0.3,
}

const PROVIDER_DEFAULTS: Record<Provider, Partial<ProviderConfig>> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    maxContextTokens: 128000,
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-5-haiku-latest',
    maxContextTokens: 200000,
  },
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'llama3.1',
    maxContextTokens: 8000,
  },
  custom: {
    baseUrl: 'http://localhost:8080/v1',
    model: '',
    maxContextTokens: 8000,
  },
}

export default function App() {
  const [config, setConfig] = useState<ProviderConfig>(DEFAULT_CONFIG)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [fetchingModels, setFetchingModels] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)

  useEffect(() => {
    chrome.storage.local.get(['llmConfig'], (result) => {
      if (result.llmConfig) {
        setConfig(result.llmConfig)
      }
    })
  }, [])

  const handleFetchModels = async () => {
    setFetchingModels(true)
    setModelsError(null)

    try {
      // Save config first so background script can use it
      await chrome.storage.local.set({ llmConfig: config })

      const response = await chrome.runtime.sendMessage({ type: 'GET_AVAILABLE_MODELS' })

      // Response is wrapped: { success: true, data: { success: boolean, models: string[], error?: string } }
      const result = response?.data ?? response
      if (result?.success && result.models?.length > 0) {
        setModels(result.models)
        // Auto-select first model if current model is not in list
        if (!result.models.includes(config.model)) {
          setConfig((prev) => ({ ...prev, model: result.models[0] }))
        }
      } else {
        setModelsError(result?.error || response?.error || 'No models found')
        setModels([])
      }
    } catch (error) {
      setModelsError(error instanceof Error ? error.message : 'Failed to fetch models')
      setModels([])
    }

    setFetchingModels(false)
  }

  const handleProviderChange = (provider: Provider) => {
    const defaults = PROVIDER_DEFAULTS[provider]
    setConfig((prev) => ({
      ...prev,
      provider,
      baseUrl: defaults.baseUrl ?? prev.baseUrl,
      model: defaults.model ?? prev.model,
      maxContextTokens: defaults.maxContextTokens ?? prev.maxContextTokens,
    }))
  }

  const handleSave = async () => {
    await chrome.storage.local.set({ llmConfig: config })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      // Save config first so background script can use it
      await chrome.storage.local.set({ llmConfig: config })

      // Route through background script to avoid CORS issues
      const response = await chrome.runtime.sendMessage({ type: 'TEST_LLM_CONNECTION' })

      // Response is wrapped: { success: true, data: { success: boolean, error?: string } }
      const result = response?.data ?? response
      if (result?.success) {
        setTestResult({ success: true, message: 'Connection successful!' })
      } else {
        setTestResult({
          success: false,
          message: result?.error || response?.error || 'Connection failed',
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      })
    }

    setTesting(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
          TabBrain Settings
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              AI Provider
            </label>
            <select
              value={config.provider}
              onChange={(e) => handleProviderChange(e.target.value as Provider)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="custom">Custom (Open WebUI, LM Studio, etc.)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="ollama">Ollama (Local)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Base URL
            </label>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) => setConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
              placeholder="https://api.example.com/v1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {config.provider !== 'ollama' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                placeholder="sk-..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Model
            </label>
            <div className="flex gap-2">
              {models.length > 0 ? (
                <select
                  value={config.model}
                  onChange={(e) => setConfig((prev) => ({ ...prev, model: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={config.model}
                  onChange={(e) => setConfig((prev) => ({ ...prev, model: e.target.value }))}
                  placeholder="gpt-3.5-turbo, llama3.1, etc."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              )}
              <button
                onClick={handleFetchModels}
                disabled={fetchingModels}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-300"
                title="Refresh models list"
              >
                {fetchingModels ? '...' : '↻'}
              </button>
            </div>
            {modelsError && (
              <p className="mt-1 text-sm text-red-500">{modelsError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Context Tokens
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                value={config.maxContextTokens}
                onChange={(e) => setConfig((prev) => ({ ...prev, maxContextTokens: parseInt(e.target.value) || 8000 }))}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                { label: '4K', value: 4000, desc: 'Small models' },
                { label: '8K', value: 8000, desc: 'Llama 3.1 8B' },
                { label: '32K', value: 32000, desc: 'Llama 3.1 70B' },
                { label: '128K', value: 128000, desc: 'GPT-4o' },
              ].map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setConfig((prev) => ({ ...prev, maxContextTokens: value }))}
                  className={`px-2 py-1 text-xs rounded border ${
                    config.maxContextTokens === value
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Controls batch size. Lower = more batches but safer. Higher = fewer API calls.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Temperature
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={config.temperature}
              onChange={(e) => setConfig((prev) => ({ ...prev, temperature: parseFloat(e.target.value) || 0.3 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              0.0-0.3 recommended for consistent categorization.
            </p>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg ${
                testResult.success
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}
            >
              {testResult.message}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              {saved ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <p className="font-medium">URL Examples:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Ollama:</strong> http://localhost:11434</li>
            <li><strong>LM Studio:</strong> http://localhost:1234/v1</li>
            <li><strong>Open WebUI:</strong> http://localhost:3000/api <span className="text-gray-400">(must end with /api)</span></li>
            <li><strong>OpenAI:</strong> https://api.openai.com/v1</li>
            <li><strong>Anthropic:</strong> https://api.anthropic.com</li>
          </ul>
          <p className="mt-2 text-xs text-gray-400">
            Click the ↻ button next to Model to fetch available models from your API.
          </p>
        </div>
      </div>
    </div>
  )
}
