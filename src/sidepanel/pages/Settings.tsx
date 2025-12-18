import { useState } from 'react'
import { useLLMConfig } from '../hooks'

interface SettingsProps {
  onBack: () => void
}

export function Settings({ onBack }: SettingsProps) {
  const { config, isConfigured, testConnection } = useLLMConfig()
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testConnection()
    setTestResult(result ?? false)
    setTesting(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <BackIcon />
        </button>
        <h2 className="text-lg font-medium">Settings</h2>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-medium mb-2">AI Provider</h3>
          {isConfigured ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StatusDot status={testResult === true ? 'success' : testResult === false ? 'error' : 'idle'} />
                <span className="text-sm">
                  {config?.provider === 'custom' ? 'Custom Provider' : config?.provider}
                </span>
              </div>
              <p className="text-xs text-gray-500">Model: {config?.model}</p>
              <p className="text-xs text-gray-500">Endpoint: {config?.baseUrl}</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={() => chrome.runtime.openOptionsPage()}
                  className="px-3 py-1.5 text-sm text-primary-600 hover:text-primary-700"
                >
                  Edit Settings
                </button>
              </div>
              {testResult !== null && (
                <p className={`text-sm mt-2 ${testResult ? 'text-green-600' : 'text-red-600'}`}>
                  {testResult ? 'Connection successful!' : 'Connection failed'}
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-3">
                Configure your AI provider to enable smart features.
              </p>
              <button
                onClick={() => chrome.runtime.openOptionsPage()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Configure AI Provider
              </button>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-medium mb-2">About</h3>
          <p className="text-sm text-gray-500">TabBrain v1.0.0</p>
          <p className="text-sm text-gray-500 mt-1">
            AI-powered tab and bookmark organizer
          </p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-medium mb-2">Keyboard Shortcuts</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Open Side Panel</span>
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">Alt + T</kbd>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-medium mb-2">Data & Privacy</h3>
          <p className="text-sm text-gray-500">
            TabBrain only accesses tab URLs and titles. Page content is never read.
            AI requests are sent to your configured provider.
          </p>
        </div>
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: 'idle' | 'success' | 'error' }) {
  const colors = {
    idle: 'bg-gray-400',
    success: 'bg-green-500',
    error: 'bg-red-500',
  }

  return (
    <span className={`w-2 h-2 rounded-full ${colors[status]}`} />
  )
}

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}
