import { NextRequest, NextResponse } from 'next/server'
import { createPayment } from '@/lib/mollie'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: params.leadId } })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const existingPayment = await prisma.payment.findUnique({
      where: { leadId: params.leadId },
    })

    if (existingPayment?.status === 'PAID') {
      return NextResponse.json({ error: 'Already paid' }, { status: 400 })
    }

    const checkoutUrl = await createPayment(params.leadId)
    return NextResponse.json({ checkoutUrl })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
