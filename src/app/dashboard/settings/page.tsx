'use client'

import { useState, useEffect } from 'react'
import { Save, Eye, EyeOff, Key, ScanSearch, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import Header from '@/components/Header'

interface Config { key: string; value: string }

const API_KEYS = [
  { key: 'GOOGLE_PLACES_API_KEY', label: 'Google Places API Key', placeholder: 'AIza…' },
  { key: 'RESEND_API_KEY', label: 'Resend API Key', placeholder: 're_…' },
  { key: 'OPENROUTER_API_KEY', label: 'OpenRouter API Key', placeholder: 'sk-or-…' },
  { key: 'MOLLIE_API_KEY', label: 'Mollie API Key', placeholder: 'live_…' },
  { key: 'DIRECTADMIN_URL', label: 'DirectAdmin URL', placeholder: 'https://server.theory7.nl:2222', secret: false },
  { key: 'DIRECTADMIN_ADMIN_USER', label: 'DirectAdmin Admin User', placeholder: 'admin', secret: false },
  { key: 'DIRECTADMIN_ADMIN_PASS', label: 'DirectAdmin Admin Password', placeholder: '••••••••' },
  { key: 'DIRECTADMIN_PACKAGE', label: 'DirectAdmin Hosting Package', placeholder: 'default', secret: false },
  { key: 'REGISTRAR_API_URL', label: 'Registrar API URL (WHMCS)', placeholder: 'https://clients.theory7.nl', secret: false },
  { key: 'REGISTRAR_API_IDENTIFIER', label: 'Registrar API Identifier', placeholder: '••••••••' },
  { key: 'REGISTRAR_API_SECRET', label: 'Registrar API Secret', placeholder: '••••••••' },
  { key: 'HUNTER_API_KEY', label: 'Hunter.io API Key', placeholder: '••••••••' },
  { key: 'GEMINI_API_KEY', label: 'Google Gemini API Key (fallback)', placeholder: 'AIza…' },
]

const DEFAULT_TEMPLATE = `Beste eigenaar van {{business_name}},

Mijn naam is Ivo van FixJeICT. Wij helpen lokale ondernemers op Goeree-Overflakkee om online beter zichtbaar te worden.

Tijdens het zoeken naar lokale bedrijven in de regio kwam ik {{business_name}} tegen. Het viel me op dat jullie prachtig werk leveren, maar dat jullie nog geen eigen website hebben.

Ik heb direct even een check gedaan en ik zag dat de domeinnaam {{suggested_domain}} nog beschikbaar is.

👉 Klik hier om {{suggested_domain}} te claimen: {{checkout_link}}

Met vriendelijke groet,
Ivo — FixJeICT
info@fixjeict.nl`

export default function SettingsPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({})
  const [shown, setShown] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [scanRadius, setScanRadius] = useState('20000')
  const [scanLocation, setScanLocation] = useState('51.7500,4.0833')
  const [emailTemplate, setEmailTemplate] = useState(DEFAULT_TEMPLATE)
  const [templateSaved, setTemplateSaved] = useState(false)

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data: Config[]) => {
        const map: Record<string, string> = {}
        data.forEach((c) => { map[c.key] = c.value })
        if (map['SCAN_RADIUS']) setScanRadius(map['SCAN_RADIUS'])
        if (map['SCAN_LOCATION']) setScanLocation(map['SCAN_LOCATION'])
        if (map['EMAIL_TEMPLATE']) setEmailTemplate(map['EMAIL_TEMPLATE'])
        setConfigs(map)
      })
      .catch(console.error)
  }, [])

  async function saveKey(key: string) {
    setSaving(key)
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: configs[key] ?? '' }),
    })
    setSaved(key)
    setTimeout(() => setSaved(null), 2000)
    setSaving(null)
  }

  async function saveScanParams() {
    await Promise.all([
      fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'SCAN_RADIUS', value: scanRadius }) }),
      fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'SCAN_LOCATION', value: scanLocation }) }),
    ])
    setSaved('scan')
    setTimeout(() => setSaved(null), 2000)
  }

  async function saveTemplate() {
    await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'EMAIL_TEMPLATE', value: emailTemplate }) })
    setTemplateSaved(true)
    setTimeout(() => setTemplateSaved(false), 2000)
  }

  return (
    <div>
      <Header title="Settings & Configuration" description="Beheer API-sleutels, scaninstellingen en e-mailsjablonen." />
      <div className="p-6">
        <Tabs defaultValue="apikeys">
          <TabsList className="mb-6">
            <TabsTrigger value="apikeys" className="gap-2"><Key className="w-4 h-4" />API Keys</TabsTrigger>
            <TabsTrigger value="scan" className="gap-2"><ScanSearch className="w-4 h-4" />Scan Parameters</TabsTrigger>
            <TabsTrigger value="template" className="gap-2"><Mail className="w-4 h-4" />Email Sjabloon</TabsTrigger>
          </TabsList>

          {/* Tab 1: API Keys */}
          <TabsContent value="apikeys">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">API Keys & Credentials</CardTitle>
                <p className="text-sm text-gray-500">Waarden worden opgeslagen in de database en overschrijven .env variabelen.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {API_KEYS.map(({ key, label, placeholder, secret = true }) => (
                  <div key={key}>
                    <Label className="mb-1.5 block">{label}</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={secret && !shown[key] ? 'password' : 'text'}
                          value={configs[key] ?? ''}
                          onChange={(e) => setConfigs((prev) => ({ ...prev, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="pr-9"
                        />
                        {secret && (
                          <button
                            type="button"
                            onClick={() => setShown((s) => ({ ...s, [key]: !s[key] }))}
                            className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                          >
                            {shown[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                      <Button
                        variant={saved === key ? 'secondary' : 'default'}
                        size="sm"
                        onClick={() => saveKey(key)}
                        disabled={saving === key}
                        className="min-w-[80px]"
                      >
                        {saved === key ? '✓ Saved' : saving === key ? '…' : <><Save className="w-3.5 h-3.5" />Save</>}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Scan Parameters */}
          <TabsContent value="scan">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scan Parameters</CardTitle>
                <p className="text-sm text-gray-500">Standaard instellingen voor de Google Places scanner.</p>
              </CardHeader>
              <CardContent className="space-y-4 max-w-lg">
                <div>
                  <Label className="mb-1.5 block">Standaard zoeklocatie (lat,lng)</Label>
                  <Input
                    value={scanLocation}
                    onChange={(e) => setScanLocation(e.target.value)}
                    placeholder="51.7500,4.0833"
                  />
                  <p className="text-xs text-gray-400 mt-1">Goeree-Overflakkee centrum: 51.7500,4.0833</p>
                </div>
                <div>
                  <Label className="mb-1.5 block">Zoekradius (meters)</Label>
                  <Input
                    type="number"
                    value={scanRadius}
                    onChange={(e) => setScanRadius(e.target.value)}
                    placeholder="20000"
                    min="1000"
                    max="50000"
                  />
                  <p className="text-xs text-gray-400 mt-1">Maximum: 50.000 m (50 km). Aanbevolen: 20.000 m.</p>
                </div>
                <Separator />
                <Button onClick={saveScanParams} variant={saved === 'scan' ? 'secondary' : 'default'}>
                  <Save className="w-4 h-4" />
                  {saved === 'scan' ? '✓ Opgeslagen' : 'Instellingen opslaan'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Email Template */}
          <TabsContent value="template">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Outreach E-mailsjabloon</CardTitle>
                <p className="text-sm text-gray-500">
                  Gebruik <code className="bg-gray-100 px-1 rounded text-xs">{'{{business_name}}'}</code>,{' '}
                  <code className="bg-gray-100 px-1 rounded text-xs">{'{{suggested_domain}}'}</code> en{' '}
                  <code className="bg-gray-100 px-1 rounded text-xs">{'{{checkout_link}}'}</code> als dynamische variabelen.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={emailTemplate}
                  onChange={(e) => setEmailTemplate(e.target.value)}
                  rows={18}
                  className="font-mono text-sm"
                />
                <Button onClick={saveTemplate} variant={templateSaved ? 'secondary' : 'default'}>
                  <Save className="w-4 h-4" />
                  {templateSaved ? '✓ Sjabloon opgeslagen' : 'Sjabloon opslaan'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
