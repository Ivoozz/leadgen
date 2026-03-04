'use client'

import { useState, useMemo } from 'react'
import { Search, MoreHorizontal, Send, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Lead {
  id: string
  businessName: string
  address: string | null
  domainSuggested: string | null
  email: string | null
  emailFound: boolean
  outreachStatus: string
  status: string
  subscriptionStatus: string
  createdAt: string
  payment: { status: string } | null
}

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'purple'> = {
  NEW: 'secondary',
  CONTACTED: 'info',
  INTERESTED: 'warning',
  PAID: 'success',
  SITE_GENERATED: 'purple',
  SITE_DEPLOYED: 'success',
  CLOSED: 'destructive',
}

const OUTREACH_BADGE: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info'> = {
  PENDING: 'secondary',
  SENT: 'info',
  DELIVERED: 'success',
  BOUNCED: 'destructive',
  REPLIED: 'success',
  SKIPPED: 'secondary',
}

export default function LeadsPipeline({ leads }: { leads: Lead[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sending, setSending] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch =
        l.businessName.toLowerCase().includes(search.toLowerCase()) ||
        (l.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (l.domainSuggested ?? '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'ALL' || l.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [leads, search, statusFilter])

  async function handleResend(leadId: string) {
    setSending(leadId)
    try {
      await fetch('/api/outreach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId }) })
    } finally {
      setSending(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <CardTitle className="text-base flex-1">
            Pipeline ({filtered.length} / {leads.length} leads)
          </CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Zoek bedrijf, email, domein…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Alle statussen</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="CONTACTED">Contacted</SelectItem>
                <SelectItem value="INTERESTED">Interested</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="SITE_DEPLOYED">Deployed</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Bedrijf</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Locatie</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Domein</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Outreach</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{lead.businessName}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{lead.address ?? '—'}</td>
                  <td className="px-4 py-3">
                    {lead.domainSuggested ? (
                      <span className="text-blue-600 font-mono text-xs">{lead.domainSuggested}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lead.emailFound ? (
                      <span className="text-xs text-gray-600 truncate max-w-[180px] block">{lead.email}</span>
                    ) : (
                      <Badge variant="secondary">Niet gevonden</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={OUTREACH_BADGE[lead.outreachStatus] ?? 'secondary'}>
                      {lead.outreachStatus}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[lead.status] ?? 'secondary'}>
                      {lead.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => window.open(`/checkout/${lead.id}`, '_blank')}
                        >
                          <Eye className="w-4 h-4" />
                          View Checkout
                        </DropdownMenuItem>
                        {lead.emailFound && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleResend(lead.id)}
                              disabled={sending === lead.id}
                            >
                              <Send className="w-4 h-4" />
                              {sending === lead.id ? 'Versturen…' : 'Resend Email'}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                    Geen leads gevonden voor dit filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
