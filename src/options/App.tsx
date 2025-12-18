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
  provider: 'custom',
  apiKey: '',
  baseUrl: 'http://localhost:3000/api',
  model: '',
  maxContextTokens: 8000,
  temperature: 0.3,
}

const PROVIDER_DEFAULTS: Record<Provider, Partial<ProviderConfig>> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    maxContextTokens: 16000,
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-haiku-20240307',
    maxContextTokens: 32000,
  },
  ollama: {
    baseUrl: 'http://localhost:11434/api',
    model: 'llama3.1',
    maxContextTokens: 8000,
  },
  custom: {
    baseUrl: '',
    model: '',
    maxContextTokens: 8000,
  },
}

export default function App() {
  const [config, setConfig] = useState<ProviderConfig>(DEFAULT_CONFIG)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    chrome.storage.local.get(['llmConfig'], (result) => {
      if (result.llmConfig) {
        setConfig(result.llmConfig)
      }
    })
  }, [])

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
      const response = await fetch(`${config.baseUrl}/models`, {
        headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
      })

      if (response.ok) {
        setTestResult({ success: true, message: 'Connection successful!' })
      } else {
        setTestResult({ success: false, message: `Error: ${response.status} ${response.statusText}` })
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
            <input
              type="text"
              value={config.model}
              onChange={(e) => setConfig((prev) => ({ ...prev, model: e.target.value }))}
              placeholder="gpt-3.5-turbo, llama3.1, etc."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Context Tokens
              </label>
              <input
                type="number"
                value={config.maxContextTokens}
                onChange={(e) => setConfig((prev) => ({ ...prev, maxContextTokens: parseInt(e.target.value) || 8000 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
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
            </div>
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

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          For Open WebUI, use the API endpoint (e.g., http://localhost:3000/api)
        </p>
      </div>
    </div>
  )
}
