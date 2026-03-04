import { prisma } from './prisma'
import { log } from './logger'

const GOOGLE_PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place'

interface PlaceResult {
  place_id: string
  name: string
  formatted_address?: string
  formatted_phone_number?: string
  website?: string
  url?: string
  types?: string[]
}

interface TextSearchResponse {
  results: PlaceResult[]
  next_page_token?: string
  status: string
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function scanLeads(
  query: string,
  batchId: string
): Promise<number> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not set')
  }

  const lat = 51.75
  const lng = 4.0833
  const radius = 20000

  let pageToken: string | undefined
  let totalProcessed = 0

  do {
    const params = new URLSearchParams({
      query,
      location: `${lat},${lng}`,
      radius: String(radius),
      key: apiKey,
    })

    if (pageToken) {
      params.set('pagetoken', pageToken)
      await sleep(2000)
    }

    const response = await fetch(
      `${GOOGLE_PLACES_API_BASE}/textsearch/json?${params.toString()}`
    )
    const data: TextSearchResponse = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      await log('error', 'scanner', `Google Places API error: ${data.status}`)
      break
    }

    for (const place of data.results) {
      if (place.website) {
        continue
      }

      const googleMapsLink = place.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
      const category = place.types?.[0] || null

      try {
        await prisma.lead.upsert({
          where: { placeId: place.place_id },
          update: {},
          create: {
            businessName: place.name,
            address: place.formatted_address || null,
            phoneNumber: place.formatted_phone_number || null,
            googleMapsLink,
            placeId: place.place_id,
            category,
            hasWebsite: false,
            scanBatchId: batchId,
          },
        })
        totalProcessed++
      } catch (err) {
        await log('warn', 'scanner', `Failed to upsert lead: ${place.name}`, {
          error: String(err),
        })
      }
    }

    pageToken = data.next_page_token
  } while (pageToken)

  await log('info', 'scanner', `Scan complete. Processed ${totalProcessed} leads without websites.`, {
    query,
    batchId,
  })

  return totalProcessed
}
