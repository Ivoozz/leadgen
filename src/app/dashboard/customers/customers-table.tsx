'use client'

import { ExternalLink, MoreHorizontal, Server, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface Customer {
  id: string
  businessName: string
  domainSuggested: string | null
  subscriptionStatus: string
  monthlyFee: string
  provisionedEmailsCount: number
  directadminUsername: string | null
  directadminServerIp: string | null
  siteUrl: string | null
  molliePaymentId: string | null
}

export default function CustomersTable({ customers }: { customers: Customer[] }) {
  const daUrl = (c: Customer) =>
    c.directadminServerIp
      ? `https://${c.directadminServerIp}:2222/CMD_ACCOUNT_USER_STATS?user=${c.directadminUsername}`
      : null

  const mollieUrl = (c: Customer) =>
    c.molliePaymentId
      ? `https://my.mollie.com/dashboard/payments/${c.molliePaymentId}`
      : 'https://my.mollie.com/dashboard'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Actieve klanten ({customers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Klant</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Domein</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Abonnement</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Maandelijks</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Emailadressen</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Hosting</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.businessName}</td>
                  <td className="px-4 py-3">
                    {c.siteUrl ? (
                      <a
                        href={c.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline font-mono text-xs"
                      >
                        {c.domainSuggested ?? c.siteUrl}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-gray-400 font-mono text-xs">{c.domainSuggested ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={c.subscriptionStatus === 'ACTIVE' ? 'success' : 'warning'}>
                      {c.subscriptionStatus === 'ACTIVE' ? 'Actief' : 'Achterstallig'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    €{c.monthlyFee}/mnd
                  </td>
                  <td className="px-4 py-3">
                    {c.provisionedEmailsCount > 0 ? (
                      <Badge variant="info">{c.provisionedEmailsCount} adressen</Badge>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.directadminUsername ? (
                      <span className="font-mono text-xs text-gray-600">{c.directadminUsername}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => window.open(mollieUrl(c), '_blank')}>
                          <CreditCard className="w-4 h-4" />
                          Bekijk in Mollie
                        </DropdownMenuItem>
                        {daUrl(c) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => window.open(daUrl(c)!, '_blank')}>
                              <Server className="w-4 h-4" />
                              Bekijk in DirectAdmin
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                    Nog geen betalende klanten.
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
