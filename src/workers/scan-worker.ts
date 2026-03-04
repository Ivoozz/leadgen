import { scanLeads } from '../lib/google-places'
import { huntEmail } from '../lib/email-hunter'
import { checkDomain } from '../lib/domain-checker'
import { log } from '../lib/logger'
import { prisma } from '../lib/prisma'

const SEARCH_QUERIES = [
  'restaurant',
  'bakkerij',
  'kapper',
  'fysiotherapie',
  'tandarts',
  'garage',
  'schilder',
  'loodgieter',
  'elektricien',
  'tuinman',
]

async function runScanWorker() {
  await log('info', 'scanner', 'Scan worker started')

  const batchId = `batch-${Date.now()}`

  for (const query of SEARCH_QUERIES) {
    try {
      const count = await scanLeads(query, batchId)
      await log('info', 'scanner', `Scanned ${count} leads for query: ${query}`)
    } catch (err) {
      await log('error', 'scanner', `Scan failed for query: ${query}`, {
        error: String(err),
      })
    }
  }

  const leads = await prisma.lead.findMany({
    where: { emailFound: false, manualFollowUp: false },
    take: 100,
  })

  for (const lead of leads) {
    try {
      await huntEmail(lead.id)
      await checkDomain(lead.id)
    } catch (err) {
      await log('error', 'scanner', `Email hunt failed for lead: ${lead.businessName}`, {
        error: String(err),
      })
    }
  }

  await log('info', 'scanner', 'Scan worker completed')
  process.exit(0)
}

runScanWorker().catch(async (err) => {
  await log('error', 'scanner', `Scan worker crashed: ${String(err)}`)
  process.exit(1)
})
