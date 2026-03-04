import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { log } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let query = 'restaurant'
  let location = 'Goeree-Overflakkee'
  try {
    const body = await req.json() as { query?: string; location?: string }
    if (body.query) query = String(body.query).slice(0, 100)
    if (body.location) location = String(body.location).slice(0, 100)
  } catch {
    // body is optional
  }

  await log('info', 'scanner', `Manual scan triggered: query="${query}" location="${location}"`)

  return NextResponse.json({
    success: true,
    message: `Scan gestart voor "${query}" in "${location}". Controleer de logs voor voortgang.`,
  })
}
