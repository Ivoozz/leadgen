# LeadGen

A full-stack **lead generation & client management platform** built with **Next.js 15**, **TypeScript**, **Prisma** and **Tailwind CSS**. LeadGen helps you discover potential clients, enrich their contact data, send outreach emails, process payments, and deploy websites automatically via DirectAdmin — all from a single dashboard.

---

## ✨ Features

- 🔍 **Lead discovery** — search businesses by location using the Google Places API
- ✉️ **Email enrichment** — find professional email addresses via Hunter.io
- 📧 **Email outreach** — send transactional & marketing emails via Resend
- 🤖 **AI copywriting** — generate content with OpenRouter and Google Gemini
- 💳 **Payments** — online payment processing via Mollie
- 🌐 **Website deployment** — automated site deployment to DirectAdmin hosting via FTP
- 🏷️ **Domain registration** — register `.nl` / `.com` domains via WHMCS (Theory7)
- 🔐 **Authentication** — NextAuth.js with bcrypt-hashed credentials
- 🗄 **Database** — PostgreSQL via Prisma ORM
- 🎨 **UI** — Radix UI primitives + Tailwind CSS + Lucide icons
- 🔒 **Encryption** — AES-256-GCM encryption for stored hosting credentials
- ⚙️ **Background workers** — TypeScript workers built with a dedicated tsconfig
- 🌙 **Process management** — PM2 via `ecosystem.config.js`
- 🌍 **Nginx** — reverse proxy configuration included

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 + Radix UI |
| Database | PostgreSQL + Prisma 5 |
| Auth | NextAuth.js v4 |
| Payments | Mollie |
| Email | Resend |
| AI | OpenRouter + Google Gemini |
| Lead data | Google Places API + Hunter.io |
| Deployment | DirectAdmin + FTP (`basic-ftp`) |
| Domain reg. | WHMCS / Theory7 API |
| Process mgr. | PM2 |
| Web server | Nginx |

---

## 📦 Prerequisites

- Node.js ≥ 18
- PostgreSQL database
- PM2 (optional, for production)
- DirectAdmin server (optional, for website deployment)
- WHMCS API access (optional, for domain registration)

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Ivoozz/leadgen.git
cd leadgen
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in all required values (see [Environment Variables](#-environment-variables) below).

### 4. Set up the database

```bash
npx prisma migrate deploy
# or during development:
npx prisma db push
```

### 5. Build background workers

```bash
npm run build:workers
```

### 6. Run in development

```bash
npm run dev
```

### 7. Build for production

```bash
npm run build
npm run start
# or with PM2:
pm2 start ecosystem.config.js
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and configure each section:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret for NextAuth session encryption |
| `NEXTAUTH_URL` | Public URL of the application |
| `GOOGLE_PLACES_API_KEY` | Google Places API key for lead discovery |
| `HUNTER_API_KEY` | Hunter.io API key for email enrichment |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `MOLLIE_API_KEY` | Mollie API key for payment processing |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI content generation |
| `GEMINI_API_KEY` | Google Gemini API key (alternative AI provider) |
| `ADMIN_EMAIL` | Admin account email |
| `ADMIN_PASSWORD` | Admin account password (change before production) |
| `DASHBOARD_DOMAIN` | Domain for the admin dashboard |
| `CLIENT_SITES_DIR` | Server directory for client websites |
| `CLIENT_SITES_DOMAIN` | Base domain for hosted client sites |
| `ENCRYPTION_KEY` | AES-256-GCM key for encrypting hosting credentials (`openssl rand -hex 32`) |
| `DIRECTADMIN_URL` | DirectAdmin panel URL (e.g. `https://server:2222`) |
| `DIRECTADMIN_ADMIN_USER` | DirectAdmin admin username |
| `DIRECTADMIN_ADMIN_PASS` | DirectAdmin admin password |
| `DIRECTADMIN_PACKAGE` | Hosting package name to assign new accounts |
| `DIRECTADMIN_SERVER_IP` | Server IP address |
| `DIRECTADMIN_FTP_HOST` | FTP host for deployments (defaults to server IP) |
| `REGISTRAR_API_URL` | WHMCS base URL |
| `REGISTRAR_API_IDENTIFIER` | WHMCS API identifier |
| `REGISTRAR_API_SECRET` | WHMCS API secret |
| `REGISTRAR_NAMESERVERS` | Comma-separated nameservers for new domains |
| `REGISTRAR_CONTACT_*` | Registrant contact details for domain registration |

---

## 📁 Project Structure

```
leadgen/
├── src/
│   ├── app/          # Next.js App Router pages & API routes
│   ├── components/   # Reusable React components (Radix UI + Tailwind)
│   ├── lib/          # Utilities, API clients, Prisma client, helpers
│   └── workers/      # Background worker scripts (compiled separately)
├── prisma/           # Prisma schema & migrations
├── nginx/            # Nginx reverse proxy configuration
├── ecosystem.config.js  # PM2 process manager config
├── tsconfig.workers.json  # TypeScript config for workers build
├── install.sh        # Automated server installation script
└── .env.example      # Environment variable template
```

---

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build the Next.js application |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run build:workers` | Compile background workers with TypeScript |

---

## 🚢 Deployment

An automated `install.sh` script is provided for server setup. It installs system dependencies, configures Nginx, sets up PM2, and prepares directory structures. Review the script before running it on a fresh server.

---

## 📄 License

This project is private and not licensed for public use.