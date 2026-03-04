'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, RefreshCw, Search, Terminal, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface LogEntry {
  id: string
  level: string
  module: string
  message: string
  createdAt: string
}

const MODULE_COLORS: Record<string, string> = {
  scanner: 'text-blue-400',
  outreach: 'text-violet-400',
  payment: 'text-emerald-400',
  generator: 'text-amber-400',
  system: 'text-gray-400',
}

const LEVEL_ICON: Record<string, React.ReactNode> = {
  info: <Info className="w-3.5 h-3.5 text-blue-400" />,
  warn: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
  error: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
}

export default function LogsMonitor({ initialLogs }: { initialLogs: LogEntry[] }) {
  const [logs, setLogs] = useState(initialLogs)
  const [filter, setFilter] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [scanKeyword, setScanKeyword] = useState('')
  const [scanLocation, setScanLocation] = useState('Goeree-Overflakkee')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const filtered = logs.filter((l) => {
    const matchText = filter === '' || l.message.toLowerCase().includes(filter.toLowerCase())
    const matchModule = moduleFilter === 'all' || l.module === moduleFilter
    return matchText && matchModule
  })

  async function handleScan() {
    setScanning(true)
    setScanError(null)
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: scanKeyword || 'restaurant', location: scanLocation }),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        setScanError(err.error ?? 'Scan mislukt')
      } else {
        await handleRefresh()
      }
    } catch {
      setScanError('Scan mislukt: netwerkfout')
    } finally {
      setScanning(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const res = await fetch('/api/logs?limit=300')
      const data = await res.json() as LogEntry[]
      setLogs(data)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="space-y-4">
      {/* Scan trigger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="w-4 h-4 text-blue-600" />
            Handmatige Scan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <Label>Zoekwoord</Label>
              <Input
                placeholder="bijv. bakkerij, kapper, restaurant…"
                value={scanKeyword}
                onChange={(e) => setScanKeyword(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label>Locatie</Label>
              <Input
                placeholder="bijv. Goeree-Overflakkee"
                value={scanLocation}
                onChange={(e) => setScanLocation(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleScan} disabled={scanning} className="w-full sm:w-auto">
                {scanning ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" />Scannen…</>
                ) : (
                  <><Play className="w-4 h-4" />Start scan</>
                )}
              </Button>
            </div>
          </div>
          {scanError && (
            <p className="mt-2 text-sm text-red-600">{scanError}</p>
          )}
        </CardContent>
      </Card>

      {/* Log viewer */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <CardTitle className="text-base flex items-center gap-2 flex-1">
              <Terminal className="w-4 h-4" />
              Systeem Logs ({filtered.length})
            </CardTitle>
            <div className="flex gap-2">
              {(['all', 'scanner', 'outreach', 'payment', 'generator'] as const).map((mod) => (
                <button
                  key={mod}
                  onClick={() => setModuleFilter(mod)}
                  className={cn(
                    'px-2 py-1 text-xs rounded font-medium transition-colors',
                    moduleFilter === mod
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {mod}
                </button>
              ))}
            </div>
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Filter logs…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="bg-gray-950 rounded-b-xl font-mono text-xs h-[480px] overflow-y-auto p-4 space-y-0.5">
            {filtered.map((log) => (
              <div key={log.id} className="flex gap-2 items-start hover:bg-white/5 px-1 py-0.5 rounded">
                <span className="text-gray-600 flex-shrink-0 w-20 text-right">
                  {new Date(log.createdAt).toLocaleTimeString('nl-NL')}
                </span>
                <span className="flex-shrink-0">{LEVEL_ICON[log.level]}</span>
                <span className={cn('flex-shrink-0 w-16', MODULE_COLORS[log.module] ?? 'text-gray-400')}>
                  [{log.module}]
                </span>
                <span className={cn(
                  'flex-1 break-all',
                  log.level === 'error' ? 'text-red-300' :
                  log.level === 'warn' ? 'text-amber-300' : 'text-gray-300'
                )}>
                  {log.message}
                </span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-gray-600 text-center py-8">Geen logs gevonden</div>
            )}
            <div ref={bottomRef} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
