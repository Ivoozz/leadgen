import { NextRequest, NextResponse } from 'next/server'
import { handleWebhook } from '@/lib/mollie'
import { log } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.formData()
    const molliePaymentId = body.get('id')?.toString()

    if (!molliePaymentId) {
      return NextResponse.json({ error: 'Missing payment id' }, { status: 400 })
    }

    await handleWebhook(molliePaymentId)

    return NextResponse.json({ success: true })
  } catch (err) {
    await log('error', 'payment', `Webhook error: ${String(err)}`)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
