#!/bin/bash
# xdwTTXsp HTTPS Setup Script
# Run with: sudo ./setup-https.sh

set -e

echo "=========================================="
echo "  xdwTTXsp HTTPS Setup"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo ./setup-https.sh"
    exit 1
fi

APP_DIR="/home/shenzheng/xdwTTXsp"

# Copy nginx config
echo "[1/4] Installing nginx configuration..."
cp "$APP_DIR/nginx-xdwttxsp.conf" /etc/nginx/sites-available/xdwttxsp

# Enable site
echo "[2/4] Enabling site..."
ln -sf /etc/nginx/sites-available/xdwttxsp /etc/nginx/sites-enabled/

# Test config
echo "[3/4] Testing nginx configuration..."
nginx -t

# Reload nginx
echo "[4/4] Reloading nginx..."
systemctl reload nginx

echo ""
echo "=========================================="
echo "  HTTPS Setup Complete!"
echo "=========================================="
echo ""
echo "Access URLs:"
echo "  https://192.168.0.20"
echo "  https://localhost"
echo "  http://192.168.0.20:50000 (direct)"
echo ""
echo "Note: Browser will show certificate warning"
echo "      (self-signed certificate)"
echo ""
echo "To view logs:"
echo "  sudo tail -f /var/log/nginx/xdwttxsp-access.log"
echo "  sudo tail -f /var/log/nginx/xdwttxsp-error.log"
echo ""
