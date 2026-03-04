import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ALLOWED_KEYS = [
  'GOOGLE_PLACES_API_KEY',
  'HUNTER_API_KEY',
  'RESEND_API_KEY',
  'MOLLIE_API_KEY',
  'OPENROUTER_API_KEY',
  'GEMINI_API_KEY',
  'DASHBOARD_DOMAIN',
  'CLIENT_SITES_DOMAIN',
]

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const configs = await prisma.config.findMany({
    where: { key: { in: ALLOWED_KEYS } },
  })

  return NextResponse.json(configs)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { key: string; value: string }

  if (!ALLOWED_KEYS.includes(body.key)) {
    return NextResponse.json({ error: 'Invalid config key' }, { status: 400 })
  }

  const config = await prisma.config.upsert({
    where: { key: body.key },
    update: { value: body.value },
    create: { key: body.key, value: body.value },
  })

  return NextResponse.json(config)
}
