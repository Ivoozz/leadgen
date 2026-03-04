/**
 * Remote deployment via FTPS (FTP over TLS) using the `basic-ftp` library.
 *
 * Uploads an AI-generated website to the DirectAdmin hosting space at
 *   ~/domains/{domain}/public_html/
 *
 * Credentials come from DirectAdmin account provisioning.
 * FTP is enabled by default on DirectAdmin hosting accounts.
 */

import * as ftp from 'basic-ftp'
import { Readable } from 'stream'
import { log } from './logger'

export interface DeployOptions {
  /** FTP hostname – usually the same server as DirectAdmin */
  host: string
  /** FTP username (DirectAdmin account username) */
  username: string
  /** FTP password (plain – used in memory only) */
  password: string
  /** Domain to deploy to (determines remote directory) */
  domain: string
  /** Full HTML content of index.html */
  html: string
  /** FTP port – default 21 */
  port?: number
}

/**
 * Deploy a single `index.html` to the domain's public_html directory
 * on a DirectAdmin server using FTPS (explicit TLS).
 *
 * Returns the public HTTPS URL of the deployed site.
 */
export async function deployToRemote(options: DeployOptions): Promise<string> {
  const { host, username, password, domain, html, port = 21 } = options
  const remoteDir = `/domains/${domain}/public_html`

  const client = new ftp.Client()
  client.ftp.verbose = false   // set to true to debug FTP commands

  try {
    await client.access({
      host,
      port,
      user: username,
      password,
      secure: true,              // explicit FTPS (STARTTLS)
      secureOptions: {
        // Let's Encrypt may not yet be valid at deploy time (DNS still propagating).
        // We log a warning so operators know the connection is temporarily unverified.
        rejectUnauthorized: false,
      },
    })
    await log('warn', 'generator', `FTPS connecting to ${host} with certificate verification disabled (Let's Encrypt pending)`, { domain })

    // Ensure the target directory exists (it should from DA provisioning)
    await client.ensureDir(remoteDir)

    // Upload index.html from an in-memory readable stream
    const stream = Readable.from([Buffer.from(html, 'utf8')])
    await client.uploadFrom(stream, 'index.html')

    // Also upload a robots.txt to allow indexing
    const robotsTxt = 'User-agent: *\nAllow: /\n'
    const robotsStream = Readable.from([Buffer.from(robotsTxt, 'utf8')])
    await client.uploadFrom(robotsStream, 'robots.txt')

    const siteUrl = `https://${domain}`
    await log('info', 'generator', `Remote deploy complete: ${siteUrl}`, { host, username, domain })
    return siteUrl
  } catch (err) {
    await log('error', 'generator', `Remote FTP deploy failed for ${domain}: ${String(err)}`, {
      host,
      domain,
    })
    throw err
  } finally {
    client.close()
  }
}
