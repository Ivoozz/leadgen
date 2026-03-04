import { generateWebsite } from '../lib/ai-generator'
import { deploySite } from '../lib/site-deployer'
import { sendDeploymentNotification } from '../lib/resend'
import { log } from '../lib/logger'
import { prisma } from '../lib/prisma'

const POLL_INTERVAL_MS = 30000

async function processNextSite() {
  const lead = await prisma.lead.findFirst({
    where: {
      status: 'PAID',
      generatedSite: null,
    },
    orderBy: { updatedAt: 'asc' },
  })

  if (!lead) return

  await log('info', 'generator', `Starting site generation for ${lead.businessName}`, {
    leadId: lead.id,
  })

  const site = await prisma.generatedSite.create({
    data: {
      leadId: lead.id,
      deployPath: '',
      siteUrl: '',
      status: 'GENERATING',
    },
  })

  try {
    const aiModel = 'anthropic/claude-3.5-sonnet'

    const html = await generateWebsite({
      businessName: lead.businessName,
      category: lead.category,
      address: lead.address,
      phoneNumber: lead.phoneNumber,
      domainSuggested: lead.domainSuggested,
    })

    await prisma.generatedSite.update({
      where: { id: site.id },
      data: {
        status: 'DEPLOYING',
        aiModel,
        aiPrompt: `Premium SPA for ${lead.businessName} (${lead.category ?? 'local business'}) at ${lead.address ?? 'N/A'}`,
        generatedHtml: html,
      },
    })

    const { deployPath, siteUrl } = await deploySite({
      businessName: lead.businessName,
      html,
      leadId: lead.id,
    })

    await prisma.generatedSite.update({
      where: { id: site.id },
      data: {
        deployPath,
        siteUrl,
        domain: lead.domainSuggested ?? null,
        status: 'DEPLOYED',
        deployedAt: new Date(),
      },
    })

    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'SITE_DEPLOYED' },
    })

    await sendDeploymentNotification(lead.id, siteUrl)

    await log('info', 'generator', `Site deployed for ${lead.businessName}: ${siteUrl}`, {
      leadId: lead.id,
    })
  } catch (err) {
    await prisma.generatedSite.update({
      where: { id: site.id },
      data: { status: 'FAILED' },
    })

    await log('error', 'generator', `Site generation failed for ${lead.businessName}`, {
      leadId: lead.id,
      error: String(err),
    })
  }
}

async function runLoop() {
  await log('info', 'generator', 'Site generator worker started')

  while (true) {
    try {
      await processNextSite()
    } catch (err) {
      await log('error', 'generator', `Site generator loop error: ${String(err)}`)
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
}

runLoop().catch(async (err) => {
  await log('error', 'generator', `Site generator worker crashed: ${String(err)}`)
  process.exit(1)
})
