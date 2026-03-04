import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { log } from './logger'

const execAsync = promisify(exec)

const CLIENT_SITES_DIR = process.env.CLIENT_SITES_DIR || '/var/www/client-sites'
const CLIENT_SITES_DOMAIN = process.env.CLIENT_SITES_DOMAIN || 'sites.localhost'

function sanitizeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '')
}

export async function deploySite(params: {
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

  await log('info', 'generator', `Site deployed for ${params.businessName} at ${deployPath}`, {
    leadId: params.leadId,
    siteUrl,
  })

  try {
    const nginxConfig = generateNginxConfig(slug)
    const configPath = `/etc/nginx/sites-available/leadgen-site-${slug}`
    await fs.writeFile(configPath, nginxConfig, 'utf8')

    const enabledPath = `/etc/nginx/sites-enabled/leadgen-site-${slug}`
    try {
      await fs.unlink(enabledPath)
    } catch {
      // ignore if doesn't exist
    }
    await fs.symlink(configPath, enabledPath)

    await execAsync('nginx -t && systemctl reload nginx')
    await log('info', 'generator', `Nginx configured and reloaded for ${slug}`)
  } catch (err) {
    await log('warn', 'generator', `Nginx config failed (may not be on production server): ${String(err)}`, {
      leadId: params.leadId,
    })
  }

  return { deployPath, siteUrl }
}

function generateNginxConfig(slug: string): string {
  const sitesDir = CLIENT_SITES_DIR
  return `server {
    listen 80;
    server_name ${slug}.${CLIENT_SITES_DOMAIN};

    root ${sitesDir}/${slug};
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
`
}
