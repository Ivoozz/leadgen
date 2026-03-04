import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: { payment: true, generatedSite: true, outreachLogs: true },
  })

  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(lead)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as Record<string, unknown>

  const lead = await prisma.lead.update({
    where: { id: params.id },
    data: body,
  })

  return NextResponse.json(lead)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.lead.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
