'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'

const CONFIG_KEYS = [
  { key: 'GOOGLE_PLACES_API_KEY', label: 'Google Places API Key' },
  { key: 'HUNTER_API_KEY', label: 'Hunter.io API Key' },
  { key: 'RESEND_API_KEY', label: 'Resend API Key' },
  { key: 'MOLLIE_API_KEY', label: 'Mollie API Key' },
  { key: 'OPENROUTER_API_KEY', label: 'OpenRouter API Key' },
  { key: 'GEMINI_API_KEY', label: 'Google Gemini API Key' },
  { key: 'DASHBOARD_DOMAIN', label: 'Dashboard Domain' },
  { key: 'CLIENT_SITES_DOMAIN', label: 'Client Sites Domain' },
]

interface Config {
  key: string
  value: string
}

export default function ConfigPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data: Config[]) => {
        const map: Record<string, string> = {}
        data.forEach((c) => { map[c.key] = c.value })
        setConfigs(map)
      })
      .catch(console.error)
  }, [])

  async function handleSave(key: string) {
    setSaving(key)
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: configs[key] || '' }),
      })
      setSaved(key)
      setTimeout(() => setSaved(null), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div>
      <Header title="Configuration" />
      <div className="p-6">
        <div className="bg-white rounded-lg shadow max-w-2xl">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold text-gray-800">API Keys & Settings</h3>
            <p className="text-sm text-gray-500 mt-1">These values are stored in the database and override environment variables.</p>
          </div>
          <div className="p-6 space-y-4">
            {CONFIG_KEYS.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={configs[key] || ''}
                    onChange={(e) => setConfigs((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Enter ${label}`}
                  />
                  <button
                    onClick={() => handleSave(key)}
                    disabled={saving === key}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saved === key ? '✓' : saving === key ? '...' : 'Save'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
