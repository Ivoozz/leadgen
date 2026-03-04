import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import CheckoutClient from './checkout-client'

export default async function CheckoutPage({
  params,
}: {
  params: { leadId: string }
}) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.leadId },
    include: { payment: true },
  })

  if (!lead) {
    notFound()
  }

  const serialized = {
    id: lead.id,
    businessName: lead.businessName,
    address: lead.address,
    domainSuggested: lead.domainSuggested,
    subscriptionStatus: lead.subscriptionStatus,
    payment: lead.payment
      ? {
          status: lead.payment.status,
          amount: lead.payment.amount.toString(),
          currency: lead.payment.currency,
        }
      : null,
  }

  return <CheckoutClient lead={serialized} />
}
