import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { log } from '@/lib/logger'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await log('info', 'scanner', 'Manual scan triggered from dashboard')

  return NextResponse.json({
    success: true,
    message: 'Scan has been triggered. Check the logs for progress.',
  })
}
