import { NextRequest, NextResponse } from 'next/server'
import { createFirstPayment } from '@/lib/mollie'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
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

    // Persist email prefix preferences from the config step
    let emailPrefixes: string[] | undefined
    try {
      const body = await req.json() as { emailPrefixes?: unknown }
      if (Array.isArray(body.emailPrefixes)) {
        emailPrefixes = (body.emailPrefixes as unknown[])
          .map((p) => String(p).toLowerCase().replace(/[^a-z0-9.\-]/g, '').slice(0, 64))
          .filter(Boolean)
          .slice(0, 10)
      }
    } catch {
      // body is optional
    }

    if (emailPrefixes && emailPrefixes.length > 0) {
      await prisma.lead.update({
        where: { id: leadId },
        data: { requestedEmailPrefixes: emailPrefixes },
      })
    }

    const checkoutUrl = await createFirstPayment(leadId)
    return NextResponse.json({ checkoutUrl })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
