/**
 * DirectAdmin API integration for Theory7 white-label reseller hosting.
 *
 * Required env vars:
 *   DIRECTADMIN_URL          – e.g. https://server.theory7.nl:2222
 *   DIRECTADMIN_ADMIN_USER   – reseller admin username
 *   DIRECTADMIN_ADMIN_PASS   – reseller admin password
 *   DIRECTADMIN_PACKAGE      – hosting package name, e.g. "default"
 *   DIRECTADMIN_SERVER_IP    – server IP for the account
 */

import { randomBytes } from 'crypto'
import { log } from './logger'

const DA_URL = process.env.DIRECTADMIN_URL || ''
const DA_ADMIN_USER = process.env.DIRECTADMIN_ADMIN_USER || ''
const DA_ADMIN_PASS = process.env.DIRECTADMIN_ADMIN_PASS || ''
const DA_PACKAGE = process.env.DIRECTADMIN_PACKAGE || 'default'
const DA_SERVER_IP = process.env.DIRECTADMIN_SERVER_IP || ''

export interface ProvisionResult {
  username: string
  password: string   // plain – caller must encrypt before storing
  domain: string
  serverIp: string
}

export interface EmailAccount {
  address: string    // full email e.g. info@domain.nl
  password: string   // plain – passed to welcome email, NOT stored
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function getAuthHeader(): string {
  const encoded = Buffer.from(`${DA_ADMIN_USER}:${DA_ADMIN_PASS}`).toString('base64')
  return `Basic ${encoded}`
}

/**
 * Generate a URL-safe username from a domain label.
 * DirectAdmin usernames: max 8 chars, lowercase alphanumeric.
 */
function domainToUsername(domain: string): string {
  const label = domain.split('.')[0]
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 8) || 'user'
}

/**
 * Generate a cryptographically random password using rejection sampling
 * to avoid modulo bias.
 */
export function generatePassword(length = 20): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  const charsLen = chars.length
  // Largest multiple of charsLen that fits in a byte (0-255)
  const maxValid = Math.floor(256 / charsLen) * charsLen
  const result: string[] = []

  while (result.length < length) {
    const bytes = randomBytes(length * 2) // oversample to reduce iterations
    for (let i = 0; i < bytes.length && result.length < length; i++) {
      if (bytes[i] < maxValid) {
        result.push(chars[bytes[i] % charsLen])
      }
    }
  }

  return result.join('')
}

async function daPost(
  endpoint: string,
  params: Record<string, string>,
  asUser?: string
): Promise<string> {
  if (!DA_URL) throw new Error('DIRECTADMIN_URL is not set')

  const authHeader = asUser
    ? `Basic ${Buffer.from(`${DA_ADMIN_USER}|${asUser}:${DA_ADMIN_PASS}`).toString('base64')}`
    : getAuthHeader()

  const body = new URLSearchParams(params)
  const res = await fetch(`${DA_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`DirectAdmin ${endpoint} HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  return text
}

// -------------------------------------------------------------------
// 1. Create hosting account
// -------------------------------------------------------------------

/**
 * Provision a new DirectAdmin user account for the given domain.
 * Returns the generated credentials (caller must encrypt password before DB storage).
 */
export async function provisionHostingAccount(domain: string): Promise<ProvisionResult> {
  let username = domainToUsername(domain)
  const password = generatePassword()
  const email = `admin@${domain}`

  // Ensure username uniqueness by appending random suffix if collision
  const randomSuffix = randomBytes(2).toString('hex').slice(0, 2)
  username = (username.slice(0, 6) + randomSuffix).slice(0, 8)

  await daPost('CMD_API_ACCOUNT_USER', {
    action: 'create',
    add: 'Submit',
    username,
    email,
    passwd: password,
    passwd2: password,
    domain,
    package: DA_PACKAGE,
    ip: DA_SERVER_IP,
    notify: 'no',
  })

  await log('info', 'generator', `DirectAdmin account created: ${username} for ${domain}`)

  return {
    username,
    password,
    domain,
    serverIp: DA_SERVER_IP,
  }
}

// -------------------------------------------------------------------
// 2. Issue Let's Encrypt SSL certificate
// -------------------------------------------------------------------

/**
 * Triggers Let's Encrypt certificate issuance for the domain via DirectAdmin.
 * Must be called after the domain DNS has propagated.
 */
export async function issueSSLCertificate(
  username: string,
  domain: string
): Promise<void> {
  try {
    // Enable AutoSSL (Let's Encrypt) for the user
    await daPost(
      'CMD_API_SSL',
      {
        action: 'save',
        type: 'letsencrypt',
        domain,
        request: 'yes',
        background: 'auto',
      },
      username
    )

    await log('info', 'generator', `SSL certificate requested for ${domain}`)
  } catch (err) {
    // SSL can fail if DNS hasn't propagated yet; log and continue
    await log(
      'warn',
      'generator',
      `SSL issuance for ${domain} deferred (DNS propagation may be pending): ${String(err)}`
    )
  }
}

// -------------------------------------------------------------------
// 3. Create POP/IMAP email accounts (CMD_API_POP)
// -------------------------------------------------------------------

/**
 * Create email accounts for the given prefixes on `domain`.
 * Returns an array of { address, password } – passwords are NOT stored in DB.
 */
export async function createEmailAccounts(
  username: string,
  domain: string,
  prefixes: string[]
): Promise<EmailAccount[]> {
  const results: EmailAccount[] = []

  for (const prefix of prefixes) {
    // Sanitise: lowercase, alphanumeric + dot/hyphen, max 64 chars
    const safe = prefix
      .toLowerCase()
      .replace(/[^a-z0-9.\-]/g, '')
      .slice(0, 64)

    if (!safe) continue

    const password = generatePassword(16)

    try {
      await daPost(
        'CMD_API_POP',
        {
          action: 'create',
          domain,
          user: safe,
          passwd: password,
          passwd2: password,
          quota: '250',  // MB
          limit: '0',    // unlimited
        },
        username
      )

      const address = `${safe}@${domain}`
      results.push({ address, password })

      await log('info', 'generator', `Email account created: ${address}`)
    } catch (err) {
      await log('warn', 'generator', `Email account creation failed for ${safe}@${domain}: ${String(err)}`)
    }
  }

  return results
}
