/**
 * Site deployment orchestrator.
 *
 * Full remote pipeline (Theory7 / DirectAdmin):
 *   1. Check / register domain via WHMCS registrar API
 *   2. Provision DirectAdmin hosting account
 *   3. Deploy AI-generated HTML via FTPS
 *   4. Request Let's Encrypt SSL
 *   5. Persist DA credentials (password AES-256-GCM encrypted) to DB
 *
 * Falls back to local Nginx deployment when DirectAdmin env vars are absent
 * (useful for local dev / testing).
 */

import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { log } from './logger'
import { prisma } from './prisma'
import { checkDomainAvailability, registerDomain } from './domain-registrar'
import { provisionHostingAccount, issueSSLCertificate } from './directadmin'
import { deployToRemote } from './remote-deployer'
import { encrypt } from './crypto'

const execAsync = promisify(exec)
const CLIENT_SITES_DIR = process.env.CLIENT_SITES_DIR || '/var/www/client-sites'
const CLIENT_SITES_DOMAIN = process.env.CLIENT_SITES_DOMAIN || 'sites.localhost'
const DA_URL = process.env.DIRECTADMIN_URL || ''
const DA_SERVER_HOST = process.env.DIRECTADMIN_FTP_HOST || process.env.DIRECTADMIN_SERVER_IP || ''

function sanitizeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '')
}

// -------------------------------------------------------------------
// Remote deployment (Theory7 / DirectAdmin)
// -------------------------------------------------------------------
async function deployRemote(params: {
  businessName: string
  html: string
  leadId: string
  domainSuggested: string | null
}): Promise<{ deployPath: string; siteUrl: string }> {
  const { businessName, html, leadId, domainSuggested } = params

  // 1. Determine / register domain
  let domain: string
  if (domainSuggested) {
    domain = domainSuggested
  } else {
    const check = await checkDomainAvailability(businessName)
    domain = check.domain
    if (check.available) {
      try {
        await registerDomain(domain)
      } catch (err) {
        await log('warn', 'generator', `Domain registration failed, continuing: ${String(err)}`, { leadId })
      }
    }
  }

  // Update domain on Lead record
  await prisma.lead.update({
    where: { id: leadId },
    data: { domainSuggested: domain, domainAvailable: true },
  })

  // 2. Provision DirectAdmin hosting account
  const { username, password, serverIp } = await provisionHostingAccount(domain)

  // 3. Encrypt + persist DA credentials (password never stored in plain text)
  let encryptedPassword: string | null = null
  try {
    encryptedPassword = encrypt(password)
  } catch {
    // ENCRYPTION_KEY not set – log clearly and store a sentinel so operators know
    await log('warn', 'generator', `Cannot encrypt DA password (ENCRYPTION_KEY missing) – storing sentinel. Manual intervention required for ${domain}`, { leadId })
    encryptedPassword = 'UNENCRYPTED_KEY_MISSING'
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      directadminUsername: username,
      directadminServerIp: serverIp,
      directadminPasswordEnc: encryptedPassword,
    },
  })

  // 4. Deploy files via FTPS
  const ftpHost = DA_SERVER_HOST || serverIp
  const siteUrl = await deployToRemote({ host: ftpHost, username, password, domain, html })

  // 5. Issue SSL certificate (best-effort – DNS may not have propagated)
  await issueSSLCertificate(username, domain)

  return { deployPath: `ftp://${ftpHost}/domains/${domain}/public_html`, siteUrl }
}

// -------------------------------------------------------------------
// Local fallback deployment (Nginx on the same server)
// -------------------------------------------------------------------
async function deployLocal(params: {
  businessName: string
  html: string
  leadId: string
}): Promise<{ deployPath: string; siteUrl: string }> {
  const slug = sanitizeSlug(params.businessName)
  const deployPath = path.join(CLIENT_SITES_DIR, slug)
  const indexPath = path.join(deployPath, 'index.html')
  const siteUrl = `http://${slug}.${CLIENT_SITES_DOMAIN}`

  await fs.mkdir(deployPath, { recursive: true })
  await fs.writeFile(indexPath, params.html, 'utf8')

  await log('info', 'generator', `Site deployed locally for ${params.businessName} at ${deployPath}`, {
    leadId: params.leadId,
    siteUrl,
  })

  try {
    const nginxConf = generateNginxConfig(slug)
    const confPath = `/etc/nginx/sites-available/leadgen-site-${slug}`
    await fs.writeFile(confPath, nginxConf, 'utf8')
    const enabledPath = `/etc/nginx/sites-enabled/leadgen-site-${slug}`
    try { await fs.unlink(enabledPath) } catch { /* ignore */ }
    await fs.symlink(confPath, enabledPath)
    await execAsync('nginx -t && systemctl reload nginx')
    await log('info', 'generator', `Nginx configured for ${slug}`)
  } catch (err) {
    await log('warn', 'generator', `Nginx config skipped: ${String(err)}`, { leadId: params.leadId })
  }

  return { deployPath, siteUrl }
}

function generateNginxConfig(slug: string): string {
  return `server {
    listen 80;
    server_name ${slug}.${CLIENT_SITES_DOMAIN};

    root ${CLIENT_SITES_DIR}/${slug};
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
`
}

// -------------------------------------------------------------------
// Public entry point
// -------------------------------------------------------------------
export async function deploySite(params: {
  businessName: string
  html: string
  leadId: string
  domainSuggested?: string | null
}): Promise<{ deployPath: string; siteUrl: string }> {
  const useRemote = Boolean(DA_URL && DA_SERVER_HOST)

  if (useRemote) {
    return deployRemote({
      businessName: params.businessName,
      html: params.html,
      leadId: params.leadId,
      domainSuggested: params.domainSuggested ?? null,
    })
  }

  return deployLocal({
    businessName: params.businessName,
    html: params.html,
    leadId: params.leadId,
  })
}

