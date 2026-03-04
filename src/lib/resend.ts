import { Resend } from 'resend'
import { prisma } from './prisma'
import { log } from './logger'

const resend = new Resend(process.env.RESEND_API_KEY)

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ivo.nipius@gmail.com'
const DASHBOARD_DOMAIN = process.env.DASHBOARD_DOMAIN || 'localhost'

export async function sendAdminNotification({
  subject,
  message,
}: {
  subject: string
  message: string
}): Promise<void> {
  try {
    await resend.emails.send({
      from: 'LeadGen Platform <noreply@leadgen.local>',
      to: ADMIN_EMAIL,
      subject,
      text: message,
    })
  } catch (err) {
    await log('error', 'outreach', `Failed to send admin notification: ${subject}`, {
      error: String(err),
    })
  }
}

export async function sendOutreachEmail(leadId: string): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead || !lead.email) return

  const checkoutUrl = `https://${DASHBOARD_DOMAIN}/checkout/${leadId}`
  const domainLine = lead.domainAvailable && lead.domainSuggested
    ? `We noticed that ${lead.domainSuggested} is still available — we can register this for your business.`
    : lead.domainSuggested
    ? `We can build your website on a domain that matches your business name.`
    : `We can build your website on a professional domain.`

  const subject = `Professional website for ${lead.businessName}`
  const body = `Dear ${lead.businessName},

We noticed that your business doesn't have a website yet. In today's digital world, having an online presence is essential to attract new customers.

We specialize in building modern, professional websites for local businesses. ${domainLine}

Your new website will include:
- Professional design tailored to your business
- Mobile-friendly layout
- Contact information and location
- Fast loading times

Get started today: ${checkoutUrl}

Best regards,
LeadGen Platform`

  try {
    const result = await resend.emails.send({
      from: 'LeadGen Platform <outreach@leadgen.local>',
      to: lead.email,
      subject,
      text: body,
    })

    await prisma.outreachLog.create({
      data: {
        leadId,
        emailTo: lead.email,
        subject,
        body,
        resendId: result.data?.id || null,
        status: 'sent',
      },
    })

    await prisma.lead.update({
      where: { id: leadId },
      data: { outreachStatus: 'SENT', status: 'CONTACTED' },
    })

    await log('info', 'outreach', `Outreach email sent to ${lead.email} for ${lead.businessName}`, {
      leadId,
      resendId: result.data?.id,
    })
  } catch (err) {
    await prisma.outreachLog.create({
      data: {
        leadId,
        emailTo: lead.email,
        subject,
        body,
        status: 'failed',
      },
    })

    await log('error', 'outreach', `Failed to send outreach email to ${lead.email}`, {
      leadId,
      error: String(err),
    })
  }
}

export async function sendDeploymentNotification(leadId: string, siteUrl: string): Promise<void> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { payment: true },
  })
  if (!lead) return

  const subject = `Site deployed for ${lead.businessName}`
  const message = `A new website has been deployed!\n\nBusiness: ${lead.businessName}\nPayment: ${lead.payment?.amount || 'N/A'} ${lead.payment?.currency || 'EUR'} (${lead.payment?.status || 'N/A'})\nSite URL: ${siteUrl}`

  await sendAdminNotification({ subject, message })
}
