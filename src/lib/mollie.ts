import { createMollieClient } from '@mollie/api-client'
import { prisma } from './prisma'
import { log } from './logger'

const DASHBOARD_DOMAIN = process.env.DASHBOARD_DOMAIN || 'localhost'
const SITE_PRICE = '299.00'

export async function createPayment(leadId: string): Promise<string> {
  const mollieApiKey = process.env.MOLLIE_API_KEY
  if (!mollieApiKey) throw new Error('MOLLIE_API_KEY is not set')

  const mollie = createMollieClient({ apiKey: mollieApiKey })

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) throw new Error('Lead not found')

  const payment = await mollie.payments.create({
    amount: {
      currency: 'EUR',
      value: SITE_PRICE,
    },
    description: `Professional website for ${lead.businessName}`,
    redirectUrl: `https://${DASHBOARD_DOMAIN}/checkout/${leadId}?status=success`,
    webhookUrl: `https://${DASHBOARD_DOMAIN}/api/payments/webhook`,
    metadata: {
      leadId,
    },
  })

  await prisma.payment.upsert({
    where: { leadId },
    update: {
      molliePaymentId: payment.id,
      checkoutUrl: payment.getCheckoutUrl() || null,
      status: 'PENDING',
    },
    create: {
      leadId,
      molliePaymentId: payment.id,
      amount: SITE_PRICE,
      currency: 'EUR',
      status: 'PENDING',
      checkoutUrl: payment.getCheckoutUrl() || null,
    },
  })

  await log('info', 'payment', `Payment created for ${lead.businessName}`, {
    leadId,
    molliePaymentId: payment.id,
  })

  return payment.getCheckoutUrl() || ''
}

export async function handleWebhook(molliePaymentId: string): Promise<void> {
  const mollieApiKey = process.env.MOLLIE_API_KEY
  if (!mollieApiKey) throw new Error('MOLLIE_API_KEY is not set')

  const mollie = createMollieClient({ apiKey: mollieApiKey })
  const molliePayment = await mollie.payments.get(molliePaymentId)

  const dbPayment = await prisma.payment.findUnique({
    where: { molliePaymentId },
  })

  if (!dbPayment) {
    await log('warn', 'payment', `Payment not found in DB: ${molliePaymentId}`)
    return
  }

  if (molliePayment.status === 'paid') {
    await prisma.payment.update({
      where: { molliePaymentId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    })

    await prisma.lead.update({
      where: { id: dbPayment.leadId },
      data: { status: 'PAID' },
    })

    await log('info', 'payment', `Payment confirmed: ${molliePaymentId}`, {
      leadId: dbPayment.leadId,
    })
  } else if (['failed', 'canceled', 'expired'].includes(molliePayment.status)) {
    const statusMap: Record<string, string> = {
      failed: 'FAILED',
      canceled: 'FAILED',
      expired: 'EXPIRED',
    }

    await prisma.payment.update({
      where: { molliePaymentId },
      data: { status: (statusMap[molliePayment.status] || 'FAILED') as 'FAILED' | 'EXPIRED' },
    })

    await log('warn', 'payment', `Payment ${molliePayment.status}: ${molliePaymentId}`, {
      leadId: dbPayment.leadId,
    })
  }
}
