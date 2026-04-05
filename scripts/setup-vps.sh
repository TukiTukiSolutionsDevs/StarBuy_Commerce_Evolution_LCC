#!/bin/bash
# ============================================================
# StarBuy VPS Setup — Ubuntu 24.04
# Run this ONCE on a fresh VPS: ssh root@149.34.48.16 'bash -s' < scripts/setup-vps.sh
# ============================================================

set -euo pipefail

echo "═══════════════════════════════════════════"
echo "  StarBuy VPS Setup — Ubuntu 24.04"
echo "═══════════════════════════════════════════"

# ─── System updates ─────────────────────────────────────────
echo "→ Updating system..."
apt update && apt upgrade -y

# ─── Install essentials ─────────────────────────────────────
echo "→ Installing essentials..."
apt install -y curl git ufw fail2ban htop

# ─── Docker ─────────────────────────────────────────────────
echo "→ Installing Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Docker Compose plugin
apt install -y docker-compose-plugin

echo "→ Docker version:"
docker --version
docker compose version

# ─── Firewall (UFW) ─────────────────────────────────────────
echo "→ Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable
ufw status

# ─── Fail2ban ───────────────────────────────────────────────
echo "→ Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# ─── Create app user ───────────────────────────────────────
echo "→ Creating deploy user..."
if ! id "deploy" &>/dev/null; then
    useradd -m -s /bin/bash -G docker deploy
    echo "deploy ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/deploy
    echo "→ Created user 'deploy' with docker access"
else
    echo "→ User 'deploy' already exists"
fi

# ─── App directory ──────────────────────────────────────────
echo "→ Creating app directory..."
mkdir -p /opt/starbuy
chown deploy:deploy /opt/starbuy

# ─── Swap (for 1-2GB VPS) ──────────────────────────────────
if [ ! -f /swapfile ]; then
    echo "→ Creating 2GB swap..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo ""
echo "═══════════════════════════════════════════"
echo "  ✓ VPS Setup Complete!"
echo "═══════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Clone the repo:  su - deploy -c 'cd /opt/starbuy && git clone <repo>'"
echo "  2. Copy .env:       cp .env.production.example .env.production"
echo "  3. Edit .env:       nano .env.production"
echo "  4. Run deploy:      bash scripts/deploy.sh"
echo ""
