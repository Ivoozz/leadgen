import { prisma } from './prisma'
import { log } from './logger'

function slugifyDomain(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .trim()
}

async function isDomainAvailable(domain: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.whoisxmlapi.com/v1?apiKey=${process.env.WHOIS_API_KEY || ''}&domainName=${domain}&outputFormat=JSON`
    )
    if (!response.ok) return false
    const data = await response.json() as { WhoisRecord?: { dataError?: string } }
    return data?.WhoisRecord?.dataError === 'MISSING_WHOIS_DATA'
  } catch {
    return false
  }
}

export async function checkDomain(leadId: string): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead || !lead.emailFound) return

  const slug = slugifyDomain(lead.businessName)
  const candidates = [`${slug}.nl`, `${slug}.com`]

  let suggested: string | null = null
  let available = false

  for (const domain of candidates) {
    const isAvailable = await isDomainAvailable(domain)
    if (isAvailable) {
      suggested = domain
      available = true
      break
    }
  }

  if (!suggested) {
    suggested = candidates[0]
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { domainSuggested: suggested, domainAvailable: available },
  })

  await log('info', 'scanner', `Domain check for ${lead.businessName}: ${suggested} (available: ${available})`, {
    leadId,
  })
}
