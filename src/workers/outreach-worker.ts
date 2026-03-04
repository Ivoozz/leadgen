import { sendOutreachEmail } from '../lib/resend'
import { log } from '../lib/logger'
import { prisma } from '../lib/prisma'

const EMAILS_PER_RUN = 20
const DELAY_BETWEEN_EMAILS_MS = 3000

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runOutreachWorker() {
  await log('info', 'outreach', 'Outreach worker started')

  const leads = await prisma.lead.findMany({
    where: {
      emailFound: true,
      outreachStatus: 'PENDING',
    },
    take: EMAILS_PER_RUN,
    orderBy: { createdAt: 'asc' },
  })

  await log('info', 'outreach', `Found ${leads.length} leads to contact`)

  for (const lead of leads) {
    try {
      await sendOutreachEmail(lead.id)
      await sleep(DELAY_BETWEEN_EMAILS_MS)
    } catch (err) {
      await log('error', 'outreach', `Failed to send outreach to ${lead.businessName}`, {
        error: String(err),
        leadId: lead.id,
      })
    }
  }

  await log('info', 'outreach', 'Outreach worker completed')
  process.exit(0)
}

runOutreachWorker().catch(async (err) => {
  await log('error', 'outreach', `Outreach worker crashed: ${String(err)}`)
  process.exit(1)
})
