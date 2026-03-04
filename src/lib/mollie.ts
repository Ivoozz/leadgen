import { createMollieClient, SequenceType } from '@mollie/api-client'
import { prisma } from './prisma'
import { log } from './logger'

const DASHBOARD_DOMAIN = process.env.DASHBOARD_DOMAIN || 'localhost'

// Monthly subscription fee (first iDEAL payment + recurring SEPA)
const MONTHLY_FEE = '29.00'

function getMollie() {
  const mollieApiKey = process.env.MOLLIE_API_KEY
  if (!mollieApiKey) throw new Error('MOLLIE_API_KEY is not set')
  return createMollieClient({ apiKey: mollieApiKey })
}

// ------------------------------------------------------------------
// Step 1 – Create a Mollie Customer + first-sequence iDEAL payment.
// The "first" sequenceType payment establishes a mandate so we can
// set up SEPA Direct Debit recurring payments afterwards.
// ------------------------------------------------------------------
export async function createFirstPayment(leadId: string): Promise<string> {
  const mollie = getMollie()

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) throw new Error('Lead not found')

  // Re-use an existing Mollie customer if we already created one
  const existingPayment = await prisma.payment.findUnique({ where: { leadId } })
  let mollieCustomerId: string

  if (existingPayment?.mollieCustomerId) {
    mollieCustomerId = existingPayment.mollieCustomerId
  } else {
    const customer = await mollie.customers.create({
      name: lead.businessName,
      email: lead.email || undefined,
      metadata: { leadId },
    })
    mollieCustomerId = customer.id
  }

  // Create a mandate-establishing first payment via iDEAL
  const payment = await mollie.payments.create({
    customerId: mollieCustomerId,
    sequenceType: SequenceType.first,
    amount: { currency: 'EUR', value: MONTHLY_FEE },
    description: `Website abonnement ${lead.businessName} – eerste maand`,
    redirectUrl: `https://${DASHBOARD_DOMAIN}/checkout/${leadId}?status=success`,
    webhookUrl: `https://${DASHBOARD_DOMAIN}/api/payments/webhook`,
    metadata: { leadId },
  })

  await prisma.payment.upsert({
    where: { leadId },
    update: {
      molliePaymentId: payment.id,
      mollieCustomerId,
      checkoutUrl: payment.getCheckoutUrl() ?? null,
      status: 'PENDING',
    },
    create: {
      leadId,
      molliePaymentId: payment.id,
      mollieCustomerId,
      amount: MONTHLY_FEE,
      currency: 'EUR',
      status: 'PENDING',
      checkoutUrl: payment.getCheckoutUrl() ?? null,
    },
  })

  await prisma.lead.update({
    where: { id: leadId },
    data: { monthlyFee: MONTHLY_FEE },
  })

  await log('info', 'payment', `First payment created for ${lead.businessName}`, {
    leadId,
    molliePaymentId: payment.id,
    mollieCustomerId,
  })

  return payment.getCheckoutUrl() ?? ''
}

// ------------------------------------------------------------------
// Step 2 – After the first payment succeeds, activate a monthly
// SEPA Direct Debit subscription on the same customer.
// Mollie creates a mandate automatically after the first payment;
// we retrieve it and attach it to the subscription.
// ------------------------------------------------------------------
async function activateSubscription(mollieCustomerId: string, leadId: string): Promise<void> {
  const mollie = getMollie()

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) return

  // Fetch the mandate that Mollie created after the first payment
  const mandates = await mollie.customerMandates.list({ customerId: mollieCustomerId })
  const validMandate = mandates.find((m) => m.status === 'valid')
  if (!validMandate) {
    await log('warn', 'payment', `No valid mandate found for customer ${mollieCustomerId}`, { leadId })
    return
  }

  const subscription = await mollie.customerSubscriptions.create({
    customerId: mollieCustomerId,
    mandateId: validMandate.id,
    amount: { currency: 'EUR', value: MONTHLY_FEE },
    interval: '1 month',
    description: `Website abonnement ${lead.businessName} – maandelijkse verlenging`,
    webhookUrl: `https://${DASHBOARD_DOMAIN}/api/payments/webhook`,
    metadata: { leadId },
  })

  await prisma.payment.update({
    where: { leadId },
    data: { mollieSubscriptionId: subscription.id },
  })

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      subscriptionId: subscription.id,
      subscriptionStatus: 'ACTIVE',
    },
  })

  await log('info', 'payment', `Subscription activated: ${subscription.id}`, {
    leadId,
    subscriptionId: subscription.id,
  })
}

// ------------------------------------------------------------------
// Webhook handler – called for every Mollie payment event.
// Covers: initial first-payment AND recurring subscription payments.
// ------------------------------------------------------------------
export async function handleWebhook(molliePaymentId: string): Promise<void> {
  const mollie = getMollie()
  const molliePayment = await mollie.payments.get(molliePaymentId)

  // Mollie embeds subscriptionId + customerId on recurring payments
  const paymentMeta = molliePayment as unknown as {
    subscriptionId?: string
    customerId?: string
  }

  // ---- Recurring subscription payment (not stored as primary record) ----
  if (paymentMeta.subscriptionId) {
    const lead = await prisma.lead.findFirst({
      where: { subscriptionId: paymentMeta.subscriptionId },
    })

    if (!lead) {
      await log('warn', 'payment', `No lead for subscriptionId: ${paymentMeta.subscriptionId}`)
      return
    }

    if (molliePayment.status === 'paid') {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { subscriptionStatus: 'ACTIVE' },
      })
      await log('info', 'payment', `Subscription renewal paid: ${paymentMeta.subscriptionId}`, {
        leadId: lead.id,
      })
    } else if (molliePayment.status === 'failed') {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { subscriptionStatus: 'PAST_DUE' },
      })
      await log('warn', 'payment', `Subscription renewal failed: ${paymentMeta.subscriptionId}`, {
        leadId: lead.id,
      })
    }

    return
  }

  // ---- Initial first-sequence payment ----
  const dbPayment = await prisma.payment.findUnique({ where: { molliePaymentId } })

  if (!dbPayment) {
    await log('warn', 'payment', `Payment not found in DB: ${molliePaymentId}`)
    return
  }

  if (molliePayment.status === 'paid') {
    await prisma.payment.update({
      where: { molliePaymentId },
      data: { status: 'PAID', paidAt: new Date() },
    })

    await prisma.lead.update({
      where: { id: dbPayment.leadId },
      data: { status: 'PAID' },
    })

    await log('info', 'payment', `First payment confirmed: ${molliePaymentId}`, {
      leadId: dbPayment.leadId,
    })

    // Activate SEPA subscription after the mandate-creating payment
    const customerId = dbPayment.mollieCustomerId ?? paymentMeta.customerId
    if (customerId) {
      try {
        await activateSubscription(customerId, dbPayment.leadId)
      } catch (err) {
        await log('error', 'payment', `Failed to activate subscription: ${String(err)}`, {
          leadId: dbPayment.leadId,
        })
      }
    }
  } else if (['failed', 'canceled', 'expired'].includes(molliePayment.status)) {
    const statusMap: Record<string, 'FAILED' | 'EXPIRED'> = {
      failed: 'FAILED',
      canceled: 'FAILED',
      expired: 'EXPIRED',
    }

    await prisma.payment.update({
      where: { molliePaymentId },
      data: { status: statusMap[molliePayment.status] ?? 'FAILED' },
    })

    await log('warn', 'payment', `Payment ${molliePayment.status}: ${molliePaymentId}`, {
      leadId: dbPayment.leadId,
    })
  }
}

// ------------------------------------------------------------------
// Cancel a subscription (e.g. when a client churns or is refunded).
// ------------------------------------------------------------------
export async function cancelSubscription(leadId: string): Promise<void> {
  const mollie = getMollie()

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead?.subscriptionId) throw new Error('No active subscription found for this lead')

  const dbPayment = await prisma.payment.findUnique({ where: { leadId } })
  if (!dbPayment?.mollieCustomerId) throw new Error('No Mollie customer ID found')

  await mollie.customerSubscriptions.cancel(lead.subscriptionId, {
    customerId: dbPayment.mollieCustomerId,
  })

  await prisma.lead.update({
    where: { id: leadId },
    data: { subscriptionStatus: 'CANCELED' },
  })

  await log('info', 'payment', `Subscription cancelled: ${lead.subscriptionId}`, { leadId })
}
