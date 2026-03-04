'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface CheckoutLead {
  id: string
  businessName: string
  address: string | null
  domainSuggested: string | null
  subscriptionStatus: string
  payment: {
    status: string
    amount: string
    currency: string
  } | null
}

type Step = 'config' | 'payment'

export default function CheckoutClient({ lead }: { lead: CheckoutLead }) {
  const [step, setStep] = useState<Step>('config')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Email prefix configuration
  const [prefixInput, setPrefixInput] = useState('')
  const [prefixes, setPrefixes] = useState<string[]>(['info'])

  const isActive = lead.subscriptionStatus === 'ACTIVE' || lead.payment?.status === 'PAID'

  function addPrefix() {
    const val = prefixInput.trim().toLowerCase().replace(/[^a-z0-9.\-]/g, '')
    if (val && !prefixes.includes(val) && prefixes.length < 10) {
      setPrefixes((p) => [...p, val])
    }
    setPrefixInput('')
  }

  function removePrefix(p: string) {
    setPrefixes((prev) => prev.filter((x) => x !== p))
  }

  async function handlePayment() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/checkout/${lead.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailPrefixes: prefixes }),
      })
      const data = await response.json() as { checkoutUrl?: string; error?: string }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        setError(data.error || 'Er ging iets mis. Probeer het opnieuw.')
        setLoading(false)
      }
    } catch {
      setError('Kan geen verbinding maken. Probeer het opnieuw.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header band */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white text-center">
          <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-1">FixJeICT – Website abonnement</p>
          <h1 className="text-2xl font-bold">{lead.businessName}</h1>
          {lead.domainSuggested && (
            <p className="text-blue-200 text-sm mt-1">{lead.domainSuggested}</p>
          )}
        </div>

        {isActive ? (
          <div className="p-8">
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
              <div className="text-3xl mb-2">✅</div>
              <p className="font-semibold text-green-800 text-lg">Betaling ontvangen!</p>
              <p className="text-sm text-green-600 mt-1">
                Uw website wordt nu automatisch gebouwd. U ontvangt een e-mail zodra deze live staat.
              </p>
            </div>
          </div>
        ) : step === 'config' ? (
          /* ── Step 1: Configuration ── */
          <div className="p-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Stel uw pakket in</h2>
              <p className="text-sm text-gray-500">
                Kies welke e-mailadressen wij voor u aanmaken op{' '}
                <span className="font-mono text-blue-600">{lead.domainSuggested ?? 'uw domein'}</span>.
              </p>
            </div>

            {/* Email prefix builder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mailadressen <span className="text-gray-400 font-normal">(optioneel, max 10)</span>
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={prefixInput}
                  onChange={(e) => setPrefixInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPrefix()}
                  placeholder="bijv. info, sales, jan"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addPrefix}
                  disabled={!prefixInput.trim() || prefixes.length >= 10}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg px-3 py-2 transition-colors disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {prefixes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {prefixes.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-3 py-1 text-xs font-mono"
                    >
                      {p}@{lead.domainSuggested ?? 'uwdomein.nl'}
                      <button onClick={() => removePrefix(p)} className="hover:text-red-500 ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {prefixes.length === 0 && (
                <p className="text-xs text-gray-400">Geen e-mailadressen geselecteerd – u kunt ze later toevoegen.</p>
              )}
            </div>

            {/* Pricing summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              {lead.domainSuggested && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Domeinnaam</span>
                  <span className="font-mono text-blue-600">{lead.domainSuggested}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Hosting + website</span>
                <span className="text-gray-800 font-medium">inbegrepen</span>
              </div>
              {prefixes.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">E-mailadressen</span>
                  <span className="text-gray-800 font-medium">{prefixes.length}× inbegrepen</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between items-baseline">
                <span className="font-semibold text-gray-800">Totaal per maand</span>
                <div>
                  <span className="font-bold text-xl text-gray-900">€29</span>
                  <span className="text-gray-500 text-sm">/mnd</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('payment')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
            >
              Doorgaan naar betaling →
            </button>
            <p className="text-center text-xs text-gray-400">
              Maandelijks opzegbaar · geen verborgen kosten
            </p>
          </div>
        ) : (
          /* ── Step 2: Payment ── */
          <div className="p-8">
            {/* Summary recap */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-3">
              {lead.address && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Locatie</span>
                  <span className="font-medium text-gray-800 text-right max-w-xs">{lead.address}</span>
                </div>
              )}
              {lead.domainSuggested && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Domeinnaam</span>
                  <span className="font-semibold text-blue-600">{lead.domainSuggested}</span>
                </div>
              )}
              {prefixes.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">E-mailadressen</span>
                  <span className="font-medium text-gray-800">{prefixes.join(', ')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Abonnement</span>
                <span className="font-medium text-gray-800">Maandelijks opzegbaar</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-baseline">
                <span className="font-semibold text-gray-800">Eerste betaling (iDEAL)</span>
                <div className="text-right">
                  <span className="font-bold text-2xl text-gray-900">€29</span>
                  <span className="text-gray-500 text-sm">/maand</span>
                </div>
              </div>
            </div>

            {/* Feature list */}
            <ul className="space-y-2 mb-6 text-sm text-gray-600">
              {[
                'Premium AI-website op maat voor uw branche',
                `Domeinnaam ${lead.domainSuggested ?? ''} inclusief`,
                'Snelle & veilige hosting met SSL-certificaat',
                'Mobielvriendelijk op elk apparaat',
                prefixes.length > 0 ? `${prefixes.length} professioneel e-mailadres${prefixes.length > 1 ? 'sen' : ''}` : null,
                'Technisch onderhoud & automatische updates',
                'Maandelijks opzegbaar – geen verborgen kosten',
              ]
                .filter(Boolean)
                .map((f) => (
                  <li key={f!} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
            </ul>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('config')}
                className="flex-shrink-0 border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium py-4 px-4 rounded-xl text-sm transition-colors"
              >
                ← Terug
              </button>
              <button
                onClick={handlePayment}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-4 rounded-xl text-base disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Verbinden met betaalpagina…
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Activeer abonnement via iDEAL – €29/mnd
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
              Veilige betaling via Mollie • iDEAL &amp; SEPA • SSL-versleuteld
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
