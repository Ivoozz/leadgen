import { prisma } from '@/lib/prisma'
import Header from '@/components/Header'
import LeadTable from '@/components/LeadTable'

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { payment: true },
  })

  const serialized = leads.map((lead) => ({
    ...lead,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    payment: lead.payment
      ? {
          ...lead.payment,
          amount: lead.payment.amount.toString(),
          createdAt: lead.payment.createdAt.toISOString(),
          updatedAt: lead.payment.updatedAt.toISOString(),
          paidAt: lead.payment.paidAt?.toISOString() || null,
        }
      : null,
  }))

  return (
    <div>
      <Header title="Leads" />
      <div className="p-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">All Leads ({leads.length})</h3>
          </div>
          <LeadTable leads={serialized} />
        </div>
      </div>
    </div>
  )
}
