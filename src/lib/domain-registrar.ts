/**
 * Domain Registrar integration (WHMCS-style REST API — Theory7).
 *
 * Required env vars:
 *   REGISTRAR_API_URL        – e.g. https://clients.theory7.nl
 *   REGISTRAR_API_IDENTIFIER – WHMCS API identifier
 *   REGISTRAR_API_SECRET     – WHMCS API secret
 *   REGISTRAR_NAMESERVERS    – comma-separated, e.g. ns1.theory7.nl,ns2.theory7.nl
 */

import { log } from './logger'

const REGISTRAR_URL = process.env.REGISTRAR_API_URL || ''
const API_IDENTIFIER = process.env.REGISTRAR_API_IDENTIFIER || ''
const API_SECRET = process.env.REGISTRAR_API_SECRET || ''
const DEFAULT_NAMESERVERS = (
  process.env.REGISTRAR_NAMESERVERS || 'ns1.theory7.nl,ns2.theory7.nl'
).split(',').map((ns) => ns.trim())

// Registrar contact details used when registering a domain
const REGISTRANT = {
  firstname: process.env.REGISTRAR_CONTACT_FIRSTNAME || 'Ivo',
  lastname: process.env.REGISTRAR_CONTACT_LASTNAME || 'Nipius',
  companyname: process.env.REGISTRAR_CONTACT_COMPANY || 'FixJeICT',
  email: process.env.REGISTRAR_CONTACT_EMAIL || 'info@fixjeict.nl',
  address1: process.env.REGISTRAR_CONTACT_ADDRESS || 'Goeree-Overflakkee',
  city: process.env.REGISTRAR_CONTACT_CITY || 'Middelharnis',
  state: process.env.REGISTRAR_CONTACT_STATE || 'Zuid-Holland',
  postcode: process.env.REGISTRAR_CONTACT_POSTCODE || '3241AA',
  country: process.env.REGISTRAR_CONTACT_COUNTRY || 'NL',
  phonenumber: process.env.REGISTRAR_CONTACT_PHONE || '+31.612345678',
}

interface WhmcsResponse {
  result: 'success' | 'error'
  message?: string
  available?: string
  domainid?: number
  [key: string]: unknown
}

async function callWhmcs(
  action: string,
  extra: Record<string, string | number>
): Promise<WhmcsResponse> {
  if (!REGISTRAR_URL) throw new Error('REGISTRAR_API_URL is not set')

  const body = new URLSearchParams({
    identifier: API_IDENTIFIER,
    secret: API_SECRET,
    action,
    responsetype: 'json',
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])),
  })

  const res = await fetch(`${REGISTRAR_URL}/includes/api.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    throw new Error(`Registrar API HTTP ${res.status}: ${res.statusText}`)
  }

  return (await res.json()) as WhmcsResponse
}

/**
 * Derive a clean domain name from a business name.
 * e.g. "Bakkerij De Hoek" → "bakkerijdehoek"
 */
export function businessNameToDomain(businessName: string): string {
  return businessName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]/g, '')       // keep only alphanumeric
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)                     // DNS label max length
}

/**
 * Check whether a domain is available.
 * Returns the first available variant (.nl preferred, then .com).
 */
export async function checkDomainAvailability(
  businessName: string
): Promise<{ domain: string; available: boolean }> {
  const base = businessNameToDomain(businessName)

  for (const tld of ['.nl', '.com']) {
    const domain = `${base}${tld}`
    try {
      const res = await callWhmcs('DomainWhois', { domain })
      if (res.available === 'true' || res.available === '1') {
        await log('info', 'system', `Domain available: ${domain}`)
        return { domain, available: true }
      }
    } catch (err) {
      await log('warn', 'system', `Domain check failed for ${domain}: ${String(err)}`)
    }
  }

  return { domain: `${base}.nl`, available: false }
}

/**
 * Register the given domain via the WHMCS API.
 * Throws if registration fails.
 */
export async function registerDomain(domain: string): Promise<void> {
  const parts = domain.split('.')
  const tld = parts.slice(1).join('.')
  const sld = parts[0]

  const nameservers = DEFAULT_NAMESERVERS.reduce<Record<string, string>>(
    (acc, ns, i) => ({ ...acc, [`nameserver${i + 1}`]: ns }),
    {}
  )

  const res = await callWhmcs('OrderAddDomain', {
    domain,
    domaintype: 'register',
    regperiod: 1,
    ...REGISTRANT,
    ...nameservers,
    addons: '',
    tld,
    sld,
    paymentmethod: 'banktransfer',
  })

  if (res.result !== 'success') {
    throw new Error(`Domain registration failed for ${domain}: ${res.message ?? 'unknown error'}`)
  }

  await log('info', 'system', `Domain registered: ${domain}`, { domainId: res.domainid })
}
