#!/usr/bin/env bash
# One-shot installer for Oracle Cloud Always Free (Ubuntu 22.04 / 24.04).
#
# Run on the VM:
#   sudo env DOMAIN=erp.example.com bash deploy/oracle/install.sh
#
# DOMAIN options:
#   erp.example.com     HTTPS via Let's Encrypt (needs a DNS A record, ports 80/443 open)
#   140.238.1.2.nip.io  HTTPS without owning a domain (nip.io resolves to the IP)
#   _                   HTTP only on port 80 (default)
#
# Optional overrides:
#   REPO=https://github.com/you/erp-pro.git
#   APP_DIR=/home/ubuntu/erp-pro
#   APP_USER=ubuntu
set -euo pipefail

REPO="${REPO:-https://github.com/amalnadhv/erp-pro.git}"
APP_DIR="${APP_DIR:-/home/ubuntu/erp-pro}"
APP_USER="${APP_USER:-${SUDO_USER:-ubuntu}}"
DOMAIN="${DOMAIN:-_}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo env DOMAIN=... bash deploy/oracle/install.sh" >&2
  exit 1
fi

echo "==> Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git gnupg iptables-persistent

echo "==> Installing Node.js 24"
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
node --version

echo "==> Fetching the app"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  mkdir -p "$(dirname "$APP_DIR")"
  git clone "$REPO" "$APP_DIR"
fi
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

echo "==> Building"
runuser -u "$APP_USER" -- bash -c "cd '$APP_DIR' && npm ci && npm run build"
mkdir -p "$APP_DIR/data"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR/data"

echo "==> Installing systemd service"
cat >/etc/systemd/system/erp.service <<EOF
[Unit]
Description=Comrade ERP Pro (SQLite)
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=$(command -v node) server/start.mjs
Environment=NODE_ENV=production
Environment=PORT=4173
Environment=ERP_DATA_DIR=$APP_DIR/data
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now erp
systemctl restart erp

echo "==> Opening ports 80/443 at the OS firewall"
# Oracle's Ubuntu images ship with iptables rules that reject everything except SSH.
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
else
  iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport 80 -j ACCEPT
  iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport 443 -j ACCEPT
  netfilter-persistent save || true
fi

echo "==> Installing Caddy"
if ! command -v caddy >/dev/null 2>&1; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

echo "==> Configuring Caddy (DOMAIN=$DOMAIN)"
if [ "$DOMAIN" = "_" ]; then
  cat >/etc/caddy/Caddyfile <<EOF
:80 {
	reverse_proxy 127.0.0.1:4173
}
EOF
else
  cat >/etc/caddy/Caddyfile <<EOF
$DOMAIN {
	reverse_proxy 127.0.0.1:4173
}
EOF
fi
systemctl enable caddy >/dev/null 2>&1 || true
systemctl restart caddy

echo
echo "Done."
echo "  Local check: curl http://127.0.0.1:4173/api/health"
if [ "$DOMAIN" = "_" ]; then
  IP=$(curl -fsS -m 5 https://api.ipify.org || true)
  echo "  Open:        http://${IP:-<your-vm-public-ip>}/"
else
  echo "  Open:        https://$DOMAIN/"
fi
echo
echo "Remember: also allow TCP 80 and 443 in the Oracle VCN security list."
