#!/bin/bash
# ============================================================
# SSL Certificate Setup — starbuyevolucion.com
# Run this ONCE before starting docker-compose with HTTPS
# ============================================================

set -euo pipefail

DOMAINS=(-d starbuyevolucion.com -d www.starbuyevolucion.com -d ai-agent.starbuyevolucion.com)
EMAIL="admin@starbuyevolucion.com"
CERTBOT_DIR="./certbot"
NGINX_DIR="./nginx"

echo "==> Creating certbot directories..."
mkdir -p "$CERTBOT_DIR/conf" "$CERTBOT_DIR/www"

echo "==> Step 1: Starting nginx in HTTP-only mode for ACME challenge..."

# Create a temporary nginx config that only serves HTTP (no SSL)
cat > "$NGINX_DIR/conf.d/temp-certbot.conf" << 'NGINX'
server {
    listen 80;
    server_name starbuyevolucion.com www.starbuyevolucion.com ai-agent.starbuyevolucion.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
NGINX

# Backup the real config
cp "$NGINX_DIR/conf.d/default.conf" "$NGINX_DIR/conf.d/default.conf.bak"
rm "$NGINX_DIR/conf.d/default.conf"

# Start only nginx (no app dependency needed for cert)
docker run -d --name starbuy-certbot-nginx \
    -p 80:80 \
    -v "$(pwd)/$NGINX_DIR/nginx.conf:/etc/nginx/nginx.conf:ro" \
    -v "$(pwd)/$NGINX_DIR/conf.d:/etc/nginx/conf.d:ro" \
    -v "$(pwd)/$CERTBOT_DIR/www:/var/www/certbot:ro" \
    nginx:alpine

echo "==> Step 2: Requesting certificates from Let's Encrypt..."

docker run --rm \
    -v "$(pwd)/$CERTBOT_DIR/conf:/etc/letsencrypt" \
    -v "$(pwd)/$CERTBOT_DIR/www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    "${DOMAINS[@]}"

echo "==> Step 3: Cleaning up temporary nginx..."
docker stop starbuy-certbot-nginx
docker rm starbuy-certbot-nginx

# Restore real config
mv "$NGINX_DIR/conf.d/default.conf.bak" "$NGINX_DIR/conf.d/default.conf"
rm -f "$NGINX_DIR/conf.d/temp-certbot.conf"

echo ""
echo "============================================================"
echo " SSL certificates obtained successfully!"
echo " Certificates are in: $CERTBOT_DIR/conf/live/starbuyevolucion.com/"
echo ""
echo " Now you can run:"
echo "   docker compose up -d --build"
echo "============================================================"
