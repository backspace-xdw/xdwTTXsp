#!/bin/bash
# Setup nginx for external access on port 50000

set -e

echo "Setting up nginx for external access..."

# Copy config
sudo cp /home/shenzheng/xdwTTXsp/nginx-external.conf /etc/nginx/sites-available/xdwttxsp

# Enable site
sudo ln -sf /etc/nginx/sites-available/xdwttxsp /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

echo ""
echo "✅ Nginx configured successfully!"
echo ""
echo "Access URL: http://ljinvestment.diskstation.me:50000"
echo ""
