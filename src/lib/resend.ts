import { Resend } from 'resend'
import { prisma } from './prisma'
import { log } from './logger'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_ADDRESS = 'FixJeICT <info@fixjeict.nl>'
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
      from: FROM_ADDRESS,
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
  const suggestedDomain = lead.domainSuggested ?? `${lead.businessName.toLowerCase().replace(/\s+/g, '')}.nl`

  const subject = `Een website voor ${lead.businessName}? (Domeinnaam is nog vrij!)`

  const htmlBody = `<p>Beste eigenaar van ${lead.businessName},</p>

<p>Mijn naam is Ivo van <strong>FixJeICT</strong>. Wij helpen lokale ondernemers op Goeree-Overflakkee om online beter zichtbaar te worden.</p>

<p>Tijdens het zoeken naar lokale bedrijven in de regio kwam ik ${lead.businessName} tegen. Het viel me op dat jullie prachtig werk leveren, maar dat jullie nog geen eigen website hebben. Tegenwoordig zoekt bijna iedereen via zijn of haar mobiele telefoon naar diensten in de buurt. Zonder website loopt u mogelijk nieuwe klanten uit de regio mis.</p>

<p>Ik heb direct even een check gedaan en ik zag dat de domeinnaam <strong>${suggestedDomain}</strong> nog beschikbaar is. Dat is een unieke kans om deze naam voor uw bedrijf te claimen voordat iemand anders het doet.</p>

<p><strong>Wat kan FixJeICT voor u betekenen?</strong><br>
Wij bieden u een volledig geautomatiseerde, stressvrije oplossing. Geen eindeloze vergaderingen of hoge eenmalige ontwikkelkosten. Voor een vast, laag bedrag per maand krijgt u van ons een professionele, moderne en mobielvriendelijke website die direct vertrouwen uitstraalt bij uw (toekomstige) klanten.</p>

<p>Wat u krijgt in ons maandelijkse pakket:</p>
<ul>
  <li>De registratie en het beheer van <strong>${suggestedDomain}</strong>.</li>
  <li>Een premium website, perfect leesbaar op mobiel, tablet en computer.</li>
  <li>Snelle en veilige hosting, inclusief technisch onderhoud en updates.</li>
</ul>

<p><strong>Hoe nu verder?</strong><br>
Alles is al voor u voorbereid. Via de onderstaande beveiligde link kunt u het domein en het maandelijkse hostingpakket direct activeren. De eerste betaling gaat veilig via iDEAL, waarna uw website direct automatisch door ons systeem wordt gebouwd en online gezet.</p>

<p>👉 <strong><a href="${checkoutUrl}">Klik hier om ${suggestedDomain} te claimen en uw website te starten</a></strong></p>

<p>Heeft u liever eerst even contact of heeft u specifieke wensen? Reageer dan gerust op deze e-mail, wij denken graag met u mee.</p>

<p>Met vriendelijke groet,<br><br>
<strong>Ivo</strong><br>
FixJeICT<br>
info@fixjeict.nl</p>`

  // Plain-text fallback (required by most spam filters)
  const textBody = `Beste eigenaar van ${lead.businessName},

Mijn naam is Ivo van FixJeICT. Wij helpen lokale ondernemers op Goeree-Overflakkee om online beter zichtbaar te worden.

Tijdens het zoeken naar lokale bedrijven in de regio kwam ik ${lead.businessName} tegen. Het viel me op dat jullie prachtig werk leveren, maar dat jullie nog geen eigen website hebben. Tegenwoordig zoekt bijna iedereen via zijn of haar mobiele telefoon naar diensten in de buurt. Zonder website loopt u mogelijk nieuwe klanten uit de regio mis.

Ik heb direct even een check gedaan en ik zag dat de domeinnaam ${suggestedDomain} nog beschikbaar is. Dat is een unieke kans om deze naam voor uw bedrijf te claimen voordat iemand anders het doet.

Wat kan FixJeICT voor u betekenen?
Wij bieden u een volledig geautomatiseerde, stressvrije oplossing. Voor een vast, laag bedrag per maand krijgt u van ons een professionele, moderne en mobielvriendelijke website.

Wat u krijgt in ons maandelijkse pakket:
- De registratie en het beheer van ${suggestedDomain}.
- Een premium website, perfect leesbaar op mobiel, tablet en computer.
- Snelle en veilige hosting, inclusief technisch onderhoud en updates.

Klik hier om ${suggestedDomain} te claimen en uw website te starten:
${checkoutUrl}

Heeft u liever eerst even contact? Reageer dan gerust op deze e-mail.

Met vriendelijke groet,

Ivo
FixJeICT
info@fixjeict.nl`

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to: lead.email,
      subject,
      html: htmlBody,
      text: textBody,
    })

    await prisma.outreachLog.create({
      data: {
        leadId,
        emailTo: lead.email,
        subject,
        body: htmlBody,
        resendId: result.data?.id ?? null,
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
        body: htmlBody,
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

  const subject = `Website live voor ${lead.businessName}`
  const message = `Nieuwe website is live!\n\nBedrijf: ${lead.businessName}\nBetaling: ${lead.payment?.amount ?? 'N/A'} ${lead.payment?.currency ?? 'EUR'}/maand (${lead.payment?.status ?? 'N/A'})\nAbonnement: ${lead.subscriptionStatus}\nWebsite URL: ${siteUrl}`

  await sendAdminNotification({ subject, message })
}
