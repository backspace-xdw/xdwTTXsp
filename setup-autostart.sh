#!/bin/bash

# xdwTTXsp Auto-Start Setup Script
# Run with: sudo ./setup-autostart.sh

set -e

APP_DIR="/home/shenzheng/xdwTTXsp"
SERVICE_DIR="/etc/systemd/system"

echo "=========================================="
echo "  xdwTTXsp Auto-Start Setup"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo ./setup-autostart.sh"
    exit 1
fi

# Copy service files
echo "[1/4] Installing systemd service files..."
cp "$APP_DIR/xdwttxsp-backend.service" "$SERVICE_DIR/"
cp "$APP_DIR/xdwttxsp-frontend.service" "$SERVICE_DIR/"

# Reload systemd
echo "[2/4] Reloading systemd daemon..."
systemctl daemon-reload

# Enable services
echo "[3/4] Enabling services for auto-start..."
systemctl enable xdwttxsp-backend.service
systemctl enable xdwttxsp-frontend.service

# Start services
echo "[4/4] Starting services..."
systemctl start xdwttxsp-backend.service
sleep 3
systemctl start xdwttxsp-frontend.service

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Services installed and enabled:"
echo "  - xdwttxsp-backend  (port 8081, 8808, 1078)"
echo "  - xdwttxsp-frontend (port 8090)"
echo ""
echo "Commands:"
echo "  sudo systemctl status xdwttxsp-backend"
echo "  sudo systemctl status xdwttxsp-frontend"
echo "  sudo systemctl restart xdwttxsp-backend"
echo "  sudo systemctl restart xdwttxsp-frontend"
echo "  sudo journalctl -u xdwttxsp-backend -f"
echo "  sudo journalctl -u xdwttxsp-frontend -f"
echo ""
echo "To disable auto-start:"
echo "  sudo systemctl disable xdwttxsp-backend"
echo "  sudo systemctl disable xdwttxsp-frontend"
echo ""
