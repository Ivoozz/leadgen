import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [
    totalLeads,
    emailsSent,
    paymentsReceived,
    sitesGenerated,
    recentLeads,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.outreachLog.count({ where: { status: 'sent' } }),
    prisma.payment.count({ where: { status: 'PAID' } }),
    prisma.generatedSite.count({ where: { status: 'DEPLOYED' } }),
    prisma.lead.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        businessName: true,
        status: true,
        createdAt: true,
      },
    }),
  ])

  return NextResponse.json({
    totalLeads,
    emailsSent,
    paymentsReceived,
    sitesGenerated,
    recentLeads,
  })
}
