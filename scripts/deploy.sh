#!/bin/bash
# ============================================================
# StarBuy Deploy Script
# Run from the project root: bash scripts/deploy.sh
# ============================================================

set -euo pipefail

DOMAIN="starbuyevolucion.com"
EMAIL="luciasechevarria@gmail.com"

echo "═══════════════════════════════════════════"
echo "  StarBuy Deploy"
echo "═══════════════════════════════════════════"

# ─── Check .env.production exists ───────────────────────────
if [ ! -f .env.production ]; then
    echo "✗ .env.production not found!"
    echo "  Copy .env.production.example → .env.production and fill in your values"
    exit 1
fi

# ─── Pull latest code ──────────────────────────────────────
echo "→ Pulling latest code..."
git pull origin main 2>/dev/null || true

# ─── SSL Certificates ──────────────────────────────────────
if [ ! -d "certbot/conf/live/$DOMAIN" ]; then
    echo "→ Obtaining SSL certificates..."

    # Start nginx temporarily for ACME challenge
    mkdir -p certbot/conf certbot/www

    # Create temporary nginx config (HTTP only, for ACME)
    mkdir -p /tmp/starbuy-nginx-tmp
    cat > /tmp/starbuy-nginx-tmp/default.conf << 'TMPNGINX'
server {
    listen 80;
    server_name starbuyevolucion.com www.starbuyevolucion.com ai-agent.starbuyevolucion.com;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 'ok'; }
}
TMPNGINX

    # Run temporary nginx
    docker run -d --name tmp-nginx \
        -p 80:80 \
        -v /tmp/starbuy-nginx-tmp:/etc/nginx/conf.d:ro \
        -v "$(pwd)/certbot/www:/var/www/certbot" \
        nginx:alpine

    sleep 3

    # Get certificate for all domains
    docker run --rm \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        -v "$(pwd)/certbot/www:/var/www/certbot" \
        certbot/certbot certonly \
        --webroot \
        --webroot-path /var/www/certbot \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        -d "ai-agent.$DOMAIN" \
        --email "$EMAIL" \
        --agree-tos \
        --non-interactive

    # Clean up temp nginx
    docker stop tmp-nginx && docker rm tmp-nginx
    rm -rf /tmp/starbuy-nginx-tmp

    echo "✓ SSL certificates obtained!"
else
    echo "✓ SSL certificates already exist"
fi

# ─── Build and deploy ──────────────────────────────────────
echo "→ Building and starting containers..."
docker compose down 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

# ─── Health check ──────────────────────────────────────────
echo "→ Waiting for app to start..."
sleep 10

if docker compose exec app wget --spider -q http://localhost:3000 2>/dev/null; then
    echo "✓ App is healthy!"
else
    echo "⚠ App may still be starting. Check: docker compose logs app"
fi

echo ""
echo "═══════════════════════════════════════════"
echo "  ✓ Deploy Complete!"
echo "═══════════════════════════════════════════"
echo ""
echo "  Storefront: https://starbuyevolucion.com"
echo "  Admin:      https://ai-agent.starbuyevolucion.com"
echo ""
echo "  Logs:       docker compose logs -f"
echo "  Status:     docker compose ps"
echo "  Restart:    docker compose restart"
echo ""
