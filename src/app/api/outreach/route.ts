import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendOutreachEmail } from '@/lib/resend'
import { prisma } from '@/lib/prisma'
import { log } from '@/lib/logger'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leads = await prisma.lead.findMany({
    where: { emailFound: true, outreachStatus: 'PENDING' },
    take: 10,
  })

  const results = []
  for (const lead of leads) {
    try {
      await sendOutreachEmail(lead.id)
      results.push({ leadId: lead.id, success: true })
    } catch (err) {
      results.push({ leadId: lead.id, success: false, error: String(err) })
    }
  }

  await log('info', 'outreach', `Manual outreach sent to ${results.length} leads`)

  return NextResponse.json({ success: true, results })
}
