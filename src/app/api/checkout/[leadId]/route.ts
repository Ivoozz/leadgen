import { NextRequest, NextResponse } from 'next/server'
import { createFirstPayment } from '@/lib/mollie'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    if (lead.subscriptionStatus === 'ACTIVE') {
      return NextResponse.json({ error: 'Subscription already active' }, { status: 400 })
    }

    const existingPayment = await prisma.payment.findUnique({ where: { leadId } })
    if (existingPayment?.status === 'PAID') {
      return NextResponse.json({ error: 'Already paid' }, { status: 400 })
    }

    const checkoutUrl = await createFirstPayment(leadId)
    return NextResponse.json({ checkoutUrl })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
