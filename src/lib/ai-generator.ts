import { log } from './logger'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export async function generateWebsite(params: {
  businessName: string
  category: string | null
  address: string | null
  phoneNumber: string | null
}): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set')
  }

  const prompt = `Generate a complete, modern, responsive landing page for a business called "${params.businessName}" in the "${params.category || 'local business'}" industry, located at "${params.address || 'the Netherlands'}". The page should include: a hero section, about section, services section, contact section with phone number ${params.phoneNumber || 'N/A'} and address ${params.address || 'N/A'}. Use Tailwind CSS via CDN. Output ONLY the complete HTML file, starting with <!DOCTYPE html>.`

  await log('info', 'generator', `Generating website for ${params.businessName}`)

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': `https://${process.env.DASHBOARD_DOMAIN || 'localhost'}`,
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 8000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
  }

  const data: OpenRouterResponse = await response.json()
  const html = data.choices[0]?.message?.content || ''

  if (!html.includes('<!DOCTYPE html>') && !html.includes('<html')) {
    throw new Error('AI did not return valid HTML')
  }

  return html
}
