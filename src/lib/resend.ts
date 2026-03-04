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

// ------------------------------------------------------------------
// Welcome & Credentials email – sent to the client after deployment
// ------------------------------------------------------------------

export interface WelcomeEmailParams {
  /** Recipient email address (the client's contact email) */
  toEmail: string
  businessName: string
  siteUrl: string
  domain: string
  /** Array of { address, password } – passwords passed in-memory, never stored */
  emailAccounts: Array<{ address: string; password: string }>
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<void> {
  const { toEmail, businessName, siteUrl, domain, emailAccounts } = params

  const subject = `Uw website is live! – ${domain}`

  const emailAccountsHtml =
    emailAccounts.length > 0
      ? `
<h2 style="color:#1e40af;margin-top:32px;">📬 Uw nieuwe e-mailadressen</h2>
<table style="width:100%;border-collapse:collapse;font-size:14px;">
  <thead>
    <tr style="background:#f1f5f9;">
      <th style="text-align:left;padding:8px 12px;border:1px solid #e2e8f0;">E-mailadres</th>
      <th style="text-align:left;padding:8px 12px;border:1px solid #e2e8f0;">Tijdelijk wachtwoord</th>
    </tr>
  </thead>
  <tbody>
    ${emailAccounts
      .map(
        (a) => `
    <tr>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;">${a.address}</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;">${a.password}</td>
    </tr>`
      )
      .join('')}
  </tbody>
</table>
<p style="margin-top:16px;"><strong>⚠️ Wijzig dit wachtwoord direct</strong> via de webmail portal: 
  <a href="https://webmail.${domain}" style="color:#2563eb;">https://webmail.${domain}</a>
</p>

<h3 style="color:#374151;margin-top:24px;">📡 Instellingen voor Outlook / Apple Mail</h3>
<table style="width:100%;border-collapse:collapse;font-size:14px;">
  <tbody>
    <tr style="background:#f8fafc;">
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;">IMAP-server (inkomend)</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;">mail.${domain}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;">IMAP-poort</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;">993 (SSL/TLS)</td>
    </tr>
    <tr style="background:#f8fafc;">
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;">SMTP-server (uitgaand)</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;">mail.${domain}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;">SMTP-poort</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;">465 (SSL/TLS)</td>
    </tr>
    <tr style="background:#f8fafc;">
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;">Gebruikersnaam</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;">Uw volledige e-mailadres</td>
    </tr>
  </tbody>
</table>`
      : ''

  const htmlBody = `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;max-width:640px;margin:0 auto;padding:0;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1d4ed8,#4f46e5);padding:40px 32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">🎉 Gefeliciteerd, ${businessName}!</h1>
    <p style="color:#bfdbfe;margin:8px 0 0;">Uw website is live en beschikbaar voor uw klanten.</p>
  </div>

  <div style="padding:32px;">

    <!-- Site live -->
    <h2 style="color:#1e40af;">🌐 Uw website is online</h2>
    <p>Uw professionele website is succesvol gebouwd en gepubliceerd op:</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center;margin:16px 0;">
      <a href="${siteUrl}" style="color:#166534;font-size:18px;font-weight:700;text-decoration:none;">
        ${siteUrl}
      </a>
    </div>
    <p>De website is mobielvriendelijk, voorzien van een SSL-certificaat (groen slotje) en direct vindbaar via zoekmachines.</p>

    ${emailAccountsHtml}

    <!-- Next steps -->
    <h2 style="color:#1e40af;margin-top:32px;">✅ Volgende stappen</h2>
    <ol style="padding-left:20px;line-height:1.8;">
      <li>Bekijk uw website via <a href="${siteUrl}" style="color:#2563eb;">${siteUrl}</a></li>
      ${emailAccounts.length > 0 ? `<li>Stel uw e-mailadressen in via de bovenstaande serverinstellingen</li>
      <li><strong>Wijzig uw e-mailwachtwoord(en)</strong> via <a href="https://webmail.${domain}" style="color:#2563eb;">webmail.${domain}</a></li>` : ''}
      <li>Neem contact op als u wijzigingen of aanvullingen wenst</li>
    </ol>

    <!-- Footer -->
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
    <p style="font-size:13px;color:#6b7280;text-align:center;">
      Met vriendelijke groet,<br>
      <strong>Ivo – FixJeICT</strong><br>
      <a href="mailto:info@fixjeict.nl" style="color:#2563eb;">info@fixjeict.nl</a>
    </p>
  </div>
</body>
</html>`

  const textBody = `Gefeliciteerd, ${businessName}!

Uw website is live op: ${siteUrl}

${
    emailAccounts.length > 0
      ? `UW E-MAILADRESSEN
${emailAccounts.map((a) => `  ${a.address}  |  tijdelijk wachtwoord: ${a.password}`).join('\n')}

Wijzig uw wachtwoord via: https://webmail.${domain}

E-mailinstellingen:
  IMAP: mail.${domain}:993 (SSL)
  SMTP: mail.${domain}:465 (SSL)
  Gebruikersnaam: uw volledige e-mailadres

`
      : ''
  }
Met vriendelijke groet,
Ivo – FixJeICT
info@fixjeict.nl`

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: toEmail,
      subject,
      html: htmlBody,
      text: textBody,
    })

    await log('info', 'outreach', `Welcome email sent to ${toEmail} for ${businessName}`)
  } catch (err) {
    await log('error', 'outreach', `Failed to send welcome email to ${toEmail}: ${String(err)}`)
  }
}

