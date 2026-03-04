import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Header from '@/components/Header'
import StatsCard from '@/components/StatsCard'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const [totalLeads, emailsSent, paymentsReceived, sitesGenerated] = await Promise.all([
    prisma.lead.count(),
    prisma.outreachLog.count({ where: { status: 'sent' } }),
    prisma.payment.count({ where: { status: 'PAID' } }),
    prisma.generatedSite.count({ where: { status: 'DEPLOYED' } }),
  ])

  const recentLeads = await prisma.lead.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, businessName: true, status: true, createdAt: true },
  })

  return (
    <div>
      <Header title="Dashboard Overview" />
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard title="Total Leads" value={totalLeads} icon="👥" color="bg-blue-100" />
          <StatsCard title="Emails Sent" value={emailsSent} icon="📧" color="bg-green-100" />
          <StatsCard title="Payments" value={paymentsReceived} icon="💳" color="bg-yellow-100" />
          <StatsCard title="Sites Deployed" value={sitesGenerated} icon="🌐" color="bg-purple-100" />
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold text-gray-800">Recent Leads</h3>
          </div>
          <div className="divide-y">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="px-6 py-3 flex items-center justify-between">
                <span className="font-medium text-gray-900">{lead.businessName}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {lead.status}
                  </span>
                </div>
              </div>
            ))}
            {recentLeads.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">No leads yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
