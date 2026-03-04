import { prisma } from './prisma'
import { log } from './logger'
import { sendAdminNotification } from './resend'

interface HunterDomainSearchResponse {
  data?: {
    emails?: Array<{ value: string; confidence: number }>
  }
  errors?: Array<{ id: string; details: string }>
}

function slugifyDomain(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .trim()
}

async function huntViaHunter(domain: string): Promise<string | null> {
  const apiKey = process.env.HUNTER_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKey}`
    )
    const data: HunterDomainSearchResponse = await response.json()

    if (data.data?.emails && data.data.emails.length > 0) {
      const sorted = data.data.emails.sort((a, b) => b.confidence - a.confidence)
      return sorted[0].value
    }
  } catch (err) {
    await log('warn', 'outreach', `Hunter.io search failed for ${domain}`, {
      error: String(err),
    })
  }

  return null
}

export async function huntEmail(leadId: string): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) return

  if (lead.emailFound) return

  let email: string | null = null
  let emailSource: string | null = null

  const slug = slugifyDomain(lead.businessName)
  const domains = [`${slug}.nl`, `${slug}.com`]

  for (const domain of domains) {
    email = await huntViaHunter(domain)
    if (email) {
      emailSource = 'hunter'
      break
    }
  }

  if (email) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { email, emailSource, emailFound: true },
    })
    await log('info', 'outreach', `Email found for ${lead.businessName}: ${email}`, {
      leadId,
      source: emailSource,
    })
  } else {
    await prisma.lead.update({
      where: { id: leadId },
      data: { manualFollowUp: true },
    })

    await sendAdminNotification({
      subject: `Manual follow-up needed: ${lead.businessName}`,
      message: `Could not find email automatically for:\n\nBusiness: ${lead.businessName}\nAddress: ${lead.address || 'N/A'}\nPhone: ${lead.phoneNumber || 'N/A'}\nGoogle Maps: ${lead.googleMapsLink || 'N/A'}`,
    })

    await log('info', 'outreach', `No email found for ${lead.businessName}, flagged for manual follow-up`, {
      leadId,
    })
  }
}
