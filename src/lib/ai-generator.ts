import { log } from './logger'

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export interface WebsiteParams {
  businessName: string
  category: string | null
  address: string | null
  phoneNumber: string | null
  domainSuggested?: string | null
}

// ---------------------------------------------------------------------------
// Build the detailed system + user prompt that instructs the model to produce
// a premium, long-form single-page website (7 full sections + sticky nav +
// footer).  The result must be a *complete* standalone HTML file so we can
// write it directly to disk and serve it via Nginx with zero post-processing.
// ---------------------------------------------------------------------------
function buildPrompt(params: WebsiteParams): { system: string; user: string } {
  const industry = params.category ?? 'lokaal bedrijf'
  const address = params.address ?? 'Goeree-Overflakkee, Nederland'
  const phone = params.phoneNumber ?? ''
  const domain = params.domainSuggested ?? ''

  const system = `You are an expert front-end developer and conversion-rate optimisation specialist. \
You write complete, self-contained HTML files that look like they were built by a top Dutch web agency. \
Every file you output:
- Starts exactly with <!DOCTYPE html> and contains no text before or after the HTML.
- Uses Tailwind CSS loaded from the official CDN (https://cdn.tailwindcss.com) for ALL styling – no inline <style> blocks.
- Uses Alpine.js loaded from CDN (https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js) for any interactivity (mobile menu, FAQ accordion, smooth scroll).
- Is fully responsive and looks perfect on mobile (375 px), tablet (768 px) and desktop (1440 px).
- Contains every section listed in the user message – do NOT omit any section.
- Uses Dutch language throughout all visible copy.
- Contains NO placeholder text like "Lorem ipsum" – every sentence must be realistic, specific copy for the business.
- All images use a single unsplash photo URL that is thematically relevant (e.g. https://images.unsplash.com/photo-… ?auto=format&fit=crop&w=1200&q=80).`

  const user = `Build a COMPLETE, PREMIUM, CONVERSION-OPTIMISED single-page website (Long-Form SPA) for the following business.

Business name: ${params.businessName}
Industry / category: ${industry}
Address: ${address}${phone ? `\nPhone: ${phone}` : ''}${domain ? `\nWebsite domain: ${domain}` : ''}
Region: Goeree-Overflakkee, Zuid-Holland, Nederland

The page MUST contain every one of the following 8 sections in order:

──────────────────────────────────────────────────────────────────────────
SECTION 0 – STICKY NAVIGATION BAR
──────────────────────────────────────────────────────────────────────────
• Sticky top bar (z-50, white background, drop shadow on scroll via Alpine).
• Left: business name as a styled wordmark logo.
• Right desktop: anchor links to every section below (Home, Over ons, Diensten, Reviews, FAQ, Contact) + a prominent CTA button "Neem contact op" that scrolls to Contact.
• Right mobile: hamburger icon that opens a full-width slide-down menu (Alpine x-show with transition).
• Smooth scroll for all anchor links (add scroll-smooth to <html>).

──────────────────────────────────────────────────────────────────────────
SECTION 1 – HERO
──────────────────────────────────────────────────────────────────────────
• Full-viewport-height hero (min-h-screen).
• Full-width background image (thematic Unsplash URL) with a dark gradient overlay (bg-gradient-to-r from-black/70).
• Centred or left-aligned content: large H1 headline (max 12 words, bold, white), one-line subheadline (white/gray-200), and TWO CTA buttons side-by-side: primary "Bekijk onze diensten" (blue-600) + secondary "Bel ons nu" (outline white) – both scroll to the relevant section.
• Animated fade-in on load (use Alpine x-init + Tailwind transition/opacity classes).

──────────────────────────────────────────────────────────────────────────
SECTION 2 – OVER ONS (About Us)
──────────────────────────────────────────────────────────────────────────
• Two-column layout on desktop (image left, text right) / stacked on mobile.
• Image: relevant Unsplash photo.
• Heading "Over ${params.businessName}", 3–4 paragraph body copy that covers: founding story, local roots in Goeree-Overflakkee, the team's expertise, and core values.
• Include 3 icon+stat highlights below the copy (e.g. "15+ jaar ervaring", "200+ tevreden klanten", "5★ gemiddeld").

──────────────────────────────────────────────────────────────────────────
SECTION 3 – DIENSTEN / PRODUCTEN (Services)
──────────────────────────────────────────────────────────────────────────
• Section heading "Onze Diensten" with a one-line subtitle.
• Grid of exactly 6 service cards (3 columns desktop / 2 tablet / 1 mobile).
• Each card: large SVG icon (inline, themed to the industry), bold service title, 2–3 sentence description.
• Cards have a hover effect: shadow-xl + slight upward translate (transform hover:-translate-y-1 transition).
• Make each service highly specific to the ${industry} industry.

──────────────────────────────────────────────────────────────────────────
SECTION 4 – REFERENTIES / TESTIMONIALS (Social proof)
──────────────────────────────────────────────────────────────────────────
• Section heading "Wat onze klanten zeggen".
• Three testimonial cards in a row (desktop) / stacked (mobile).
• Each card: 5 gold stars (★★★★★), quote text (2–3 sentences, realistic Dutch), reviewer name + town on Goeree-Overflakkee (e.g. Middelharnis, Sommelsdijk, Ouddorp), circular avatar placeholder using ui-avatars.com.
• Light gray background for section, cards white with rounded-2xl and shadow.

──────────────────────────────────────────────────────────────────────────
SECTION 5 – VEELGESTELDE VRAGEN (FAQ)
──────────────────────────────────────────────────────────────────────────
• Section heading "Veelgestelde vragen".
• Exactly 6 FAQ items, each relevant to the ${industry} industry.
• Accordion pattern using Alpine.js (x-data, @click, x-show, x-transition) – clicking a question reveals the answer, clicking again collapses it.
• Clean divider lines between items; chevron icon rotates 180° when open.

──────────────────────────────────────────────────────────────────────────
SECTION 6 – CONTACT
──────────────────────────────────────────────────────────────────────────
• Two-column layout: left = contact form, right = contact details + opening hours + Google Maps placeholder.
• Contact FORM: fields for Naam (text), E-mailadres (email), Telefoonnummer (tel, optional), Bericht (textarea, 5 rows) + Submit button "Verstuur bericht" (blue-600). Add client-side required validation with Alpine.
• Contact DETAILS: phone (${phone || 'zie website'}), email address, full address (${address}).
• OPENING HOURS: a realistic HTML table showing Mon–Fri times and Sat/Sun (closed or limited) for a ${industry} business.
• GOOGLE MAPS PLACEHOLDER: a gray rounded div (w-full h-64) with text "Kaart laden…" and an iframe pointing to https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed (with sandbox attribute and no API key required).

──────────────────────────────────────────────────────────────────────────
SECTION 7 – FOOTER
──────────────────────────────────────────────────────────────────────────
• Dark background (gray-900), white / gray-400 text.
• Four columns (desktop) / two columns (mobile) / single column (small mobile):
  1. Logo + 2-line tagline + social icons (Facebook, Instagram, LinkedIn – SVG, href="#").
  2. "Snelle links": anchor links to every section.
  3. "Diensten": list the 6 service names from Section 3.
  4. "Contact": address, phone, email, opening hours summary.
• Bottom bar: copyright "© ${new Date().getFullYear()} ${params.businessName} · Alle rechten voorbehouden" + links "Privacybeleid" and "Algemene voorwaarden" (href="#").

──────────────────────────────────────────────────────────────────────────
OUTPUT RULES
──────────────────────────────────────────────────────────────────────────
• Output the COMPLETE HTML file and nothing else – no explanation, no markdown fences.
• The file must start with <!DOCTYPE html> on the very first line.
• All copy must be in Dutch and feel authentic, not machine-translated.
• Do NOT leave any TODO comments or placeholder copy.`

  return { system, user }
}

export async function generateWebsite(params: WebsiteParams): Promise<string> {
  const openrouterKey = process.env.OPENROUTER_API_KEY

  await log('info', 'generator', `Generating premium website for ${params.businessName}`)

  if (openrouterKey) {
    return generateViaOpenRouter(params, openrouterKey)
  }

  const geminiKey = process.env.GEMINI_API_KEY
  if (geminiKey) {
    return generateViaGemini(params, geminiKey)
  }

  throw new Error('No AI API key configured (OPENROUTER_API_KEY or GEMINI_API_KEY)')
}

async function generateViaOpenRouter(params: WebsiteParams, apiKey: string): Promise<string> {
  const { system, user } = buildPrompt(params)

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': `https://${process.env.DASHBOARD_DOMAIN ?? 'localhost'}`,
      'X-Title': 'FixJeICT LeadGen',
    },
    body: JSON.stringify({
      // Try Sonnet first; fall back to Haiku is handled by OpenRouter routing
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 16000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} – ${errorText}`)
  }

  const data: OpenRouterResponse = await response.json()
  return extractHtml(data.choices[0]?.message?.content ?? '')
}

async function generateViaGemini(params: WebsiteParams, apiKey: string): Promise<string> {
  const { system, user } = buildPrompt(params)

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: 16000, temperature: 0.7 },
      }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} – ${errorText}`)
  }

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return extractHtml(text)
}

function extractHtml(raw: string): string {
  // Strip markdown code fences if the model wrapped the output
  const fenced = raw.match(/```(?:html)?\s*([\s\S]*?)```/i)
  const html = fenced ? fenced[1].trim() : raw.trim()

  if (!html.includes('<!DOCTYPE html>') && !html.toLowerCase().includes('<html')) {
    throw new Error('AI response did not contain valid HTML')
  }

  return html
}
