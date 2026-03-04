'use client'

import { useState } from 'react'

interface CheckoutLead {
  id: string
  businessName: string
  address: string | null
  domainSuggested: string | null
  payment: {
    status: string
    amount: string
    currency: string
  } | null
}

export default function CheckoutClient({ lead }: { lead: CheckoutLead }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handlePayment() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/checkout/${lead.id}`, {
        method: 'POST',
      })
      const data = await response.json() as { checkoutUrl?: string; error?: string }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        setError(data.error || 'Something went wrong')
        setLoading(false)
      }
    } catch {
      setError('Failed to create payment')
      setLoading(false)
    }
  }

  const isPaid = lead.payment?.status === 'PAID'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🌐</div>
          <h1 className="text-2xl font-bold text-gray-900">
            Professional Website
          </h1>
          <p className="text-gray-500 mt-2">for {lead.businessName}</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Business</span>
            <span className="font-medium text-gray-900">{lead.businessName}</span>
          </div>
          {lead.address && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Location</span>
              <span className="font-medium text-gray-900 text-right max-w-xs">{lead.address}</span>
            </div>
          )}
          {lead.domainSuggested && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Domain</span>
              <span className="font-medium text-blue-600">{lead.domainSuggested}</span>
            </div>
          )}
          <div className="border-t pt-3 flex justify-between">
            <span className="font-semibold text-gray-800">Total</span>
            <span className="font-bold text-xl text-gray-900">€299,00</span>
          </div>
        </div>

        <div className="space-y-3 mb-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Professional AI-powered design</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Mobile-friendly & fast loading</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Domain included</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Hosting for 1 year</span>
          </div>
        </div>

        {isPaid ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">✅</div>
            <p className="font-semibold text-green-800">Payment received!</p>
            <p className="text-sm text-green-600 mt-1">Your website is being generated. We&apos;ll notify you when it&apos;s ready.</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                {error}
              </div>
            )}
            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl text-lg disabled:opacity-50 transition-colors"
            >
              {loading ? 'Connecting to payment...' : 'Pay €299 with iDEAL / Card'}
            </button>
          </>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          Secure payment via Mollie • SSL encrypted
        </p>
      </div>
    </div>
  )
}
