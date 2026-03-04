import { prisma } from '@/lib/prisma'
import Header from '@/components/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Mail, TrendingUp, DollarSign, Globe, Zap, CreditCard } from 'lucide-react'

function formatEuro(cents: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents)
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default async function DashboardPage() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalLeads,
    emailsSentThisMonth,
    activeSubscriptions,
    recentPayments,
    recentLogs,
    recentSites,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.outreachLog.count({ where: { sentAt: { gte: startOfMonth } } }),
    prisma.lead.count({ where: { subscriptionStatus: 'ACTIVE' } }),
    prisma.payment.findMany({
      where: { status: 'PAID' },
      take: 5,
      orderBy: { paidAt: 'desc' },
      include: { lead: { select: { businessName: true, domainSuggested: true } } },
    }),
    prisma.systemLog.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.generatedSite.findMany({
      where: { status: 'DEPLOYED' },
      take: 3,
      orderBy: { deployedAt: 'desc' },
      include: { lead: { select: { businessName: true, monthlyFee: true } } },
    }),
  ])

  // MRR = sum of monthlyFee for ACTIVE subscriptions
  const mrrResult = await prisma.lead.aggregate({
    where: { subscriptionStatus: 'ACTIVE' },
    _sum: { monthlyFee: true },
  })
  const mrr = Number(mrrResult._sum.monthlyFee ?? 0)

  const kpis = [
    {
      title: 'Total Leads Scanned',
      value: totalLeads.toLocaleString('nl-NL'),
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      change: '+12% vs last month',
    },
    {
      title: 'Emails Sent This Month',
      value: emailsSentThisMonth.toLocaleString('nl-NL'),
      icon: Mail,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      change: 'Since ' + startOfMonth.toLocaleDateString('nl-NL'),
    },
    {
      title: 'Active Subscriptions',
      value: activeSubscriptions.toLocaleString('nl-NL'),
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      change: 'SEPA recurring',
    },
    {
      title: 'MRR',
      value: formatEuro(mrr),
      icon: DollarSign,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      change: 'Monthly Recurring Revenue',
    },
  ]

  // Build activity feed from logs + payments + sites
  type ActivityItem = { id: string; text: string; time: Date; type: 'payment' | 'site' | 'log' }
  const activity: ActivityItem[] = [
    ...recentPayments.map((p) => ({
      id: `pay-${p.id}`,
      text: `Betaling ontvangen van ${p.lead.businessName}`,
      time: p.paidAt ?? p.createdAt,
      type: 'payment' as const,
    })),
    ...recentSites.map((s) => ({
      id: `site-${s.id}`,
      text: `Website live voor ${s.lead.businessName}`,
      time: s.deployedAt ?? s.createdAt,
      type: 'site' as const,
    })),
    ...recentLogs
      .filter((l) => l.level !== 'info' || l.module === 'scanner')
      .slice(0, 8)
      .map((l) => ({
        id: `log-${l.id}`,
        text: `[${l.module}] ${l.message.slice(0, 80)}`,
        time: l.createdAt,
        type: 'log' as const,
      })),
  ]
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 12)

  const activityIcon: Record<ActivityItem['type'], React.ReactNode> = {
    payment: <CreditCard className="w-3.5 h-3.5 text-emerald-600" />,
    site: <Globe className="w-3.5 h-3.5 text-blue-600" />,
    log: <Zap className="w-3.5 h-3.5 text-amber-600" />,
  }

  return (
    <div>
      <Header title="Dashboard" description="Welkom terug — hier is een overzicht van FixJeICT." />
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map(({ title, value, icon: Icon, color, bg, change }) => (
            <Card key={title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-gray-500">{title}</p>
                  <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-400 mt-1">{change}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recente activiteit</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-gray-100">
              {activity.length === 0 && (
                <li className="px-6 py-8 text-center text-sm text-gray-400">Geen activiteit gevonden</li>
              )}
              {activity.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {activityIcon[item.type]}
                  </div>
                  <p className="text-sm text-gray-700 flex-1 truncate">{item.text}</p>
                  <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(item.time)}</span>
                  <Badge
                    variant={item.type === 'payment' ? 'success' : item.type === 'site' ? 'info' : 'secondary'}
                    className="flex-shrink-0"
                  >
                    {item.type === 'payment' ? 'Payment' : item.type === 'site' ? 'Deployed' : 'Log'}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
