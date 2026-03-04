import { prisma } from '@/lib/prisma'
import Header from '@/components/Header'
import LeadsPipeline from './leads-pipeline'

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { payment: true },
  })

  const serialized = leads.map((l) => ({
    id: l.id,
    businessName: l.businessName,
    address: l.address,
    domainSuggested: l.domainSuggested,
    email: l.email,
    emailFound: l.emailFound,
    outreachStatus: l.outreachStatus,
    status: l.status,
    subscriptionStatus: l.subscriptionStatus,
    createdAt: l.createdAt.toISOString(),
    payment: l.payment ? { status: l.payment.status } : null,
  }))

  return (
    <div>
      <Header title="Leads & Outreach" description="Beheer en monitor de gehele outreach pipeline." />
      <div className="p-6">
        <LeadsPipeline leads={serialized} />
      </div>
    </div>
  )
}
