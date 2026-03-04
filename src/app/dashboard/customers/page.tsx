import { prisma } from '@/lib/prisma'
import Header from '@/components/Header'
import CustomersTable from './customers-table'

export default async function CustomersPage() {
  const customers = await prisma.lead.findMany({
    where: { subscriptionStatus: { in: ['ACTIVE', 'PAST_DUE'] } },
    orderBy: { updatedAt: 'desc' },
    include: {
      payment: true,
      generatedSite: { select: { siteUrl: true, status: true } },
    },
  })

  const serialized = customers.map((c) => ({
    id: c.id,
    businessName: c.businessName,
    domainSuggested: c.domainSuggested,
    subscriptionStatus: c.subscriptionStatus,
    monthlyFee: c.monthlyFee?.toString() ?? '29.00',
    provisionedEmailsCount: c.provisionedEmails.length,
    directadminUsername: c.directadminUsername,
    directadminServerIp: c.directadminServerIp,
    siteUrl: c.generatedSite?.siteUrl ?? null,
    molliePaymentId: c.payment?.molliePaymentId ?? null,
  }))

  return (
    <div>
      <Header title="Customers & Subscriptions" description="Betalende klanten met actieve abonnementen." />
      <div className="p-6">
        <CustomersTable customers={serialized} />
      </div>
    </div>
  )
}
