#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  LeadGen Platform - Installation Script ${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "${YELLOW}[1/10] Updating system...${NC}"
apt-get update && apt-get upgrade -y

echo -e "${YELLOW}[2/10] Installing system dependencies...${NC}"
apt-get install -y curl wget git nginx postgresql postgresql-contrib build-essential

echo -e "${YELLOW}[3/10] Installing Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo -e "${YELLOW}[4/10] Installing PM2...${NC}"
npm install -g pm2

echo -e "${YELLOW}[5/10] Setting up PostgreSQL...${NC}"
DB_NAME="leadgen"
DB_USER="leadgen_user"
DB_PASS=$(openssl rand -hex 32)

sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

echo -e "${YELLOW}[6/10] Setting up project...${NC}"
PROJECT_DIR="/opt/leadgen"
if [ ! -d "$PROJECT_DIR" ]; then
  mkdir -p "$PROJECT_DIR"
  if [ -f "./package.json" ]; then
    cp -r ./* "$PROJECT_DIR/"
  fi
fi
cd "$PROJECT_DIR"

echo -e "${YELLOW}[7/10] Configuring environment...${NC}"
NEXTAUTH_SECRET=$(openssl rand -base64 32)
cat > .env << EOF
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NEXTAUTH_URL="http://localhost:3000"

# API Keys - UPDATE THESE
GOOGLE_PLACES_API_KEY=""
HUNTER_API_KEY=""
RESEND_API_KEY=""
MOLLIE_API_KEY=""
OPENROUTER_API_KEY=""

# Admin
ADMIN_EMAIL="ivo.nipius@gmail.com"
ADMIN_PASSWORD="changeme123"

# Site config
DASHBOARD_DOMAIN="localhost"
CLIENT_SITES_DIR="/var/www/client-sites"
CLIENT_SITES_DOMAIN="sites.localhost"
EOF

echo -e "${YELLOW}[8/10] Installing dependencies and building...${NC}"
npm install
npx prisma generate
npx prisma db push
npx ts-node prisma/seed.ts

npm run build
npm run build:workers

mkdir -p /var/www/client-sites

echo -e "${YELLOW}[9/10] Configuring Nginx...${NC}"
cp nginx/dashboard.conf /etc/nginx/sites-available/leadgen-dashboard
cp nginx/client-sites.conf /etc/nginx/sites-available/leadgen-client-sites
ln -sf /etc/nginx/sites-available/leadgen-dashboard /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/leadgen-client-sites /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo -e "${YELLOW}[10/10] Starting services with PM2...${NC}"
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Dashboard: http://localhost:3000"
echo -e "Database password: ${DB_PASS}"
echo -e ""
echo -e "${RED}IMPORTANT: Update API keys in ${PROJECT_DIR}/.env${NC}"
echo -e "${RED}IMPORTANT: Change the admin password!${NC}"
