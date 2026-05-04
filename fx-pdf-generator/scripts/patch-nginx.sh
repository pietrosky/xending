#!/bin/bash
# Deploys the Nginx config for fx-pdf-generator.
# Copies our config to the default site, tests it, and reloads.
# Only overwrites if the config has changed.

set -e

APP_DIR="/opt/fx-pdf-generator"
NGINX_DEFAULT="/etc/nginx/sites-available/default"
NEW_CONF="$APP_DIR/nginx/default.conf"

if [ ! -f "$NEW_CONF" ]; then
  echo "No nginx config found at $NEW_CONF, skipping"
  exit 0
fi

# Check if config has changed
if diff -q "$NEW_CONF" "$NGINX_DEFAULT" > /dev/null 2>&1; then
  echo "Nginx config unchanged, skipping"
  exit 0
fi

echo "Updating Nginx config..."
cp "$NGINX_DEFAULT" "$NGINX_DEFAULT.bak"
cp "$NEW_CONF" "$NGINX_DEFAULT"

echo "Testing Nginx config..."
if ! nginx -t 2>&1; then
  echo "ERROR: Nginx config test failed, restoring backup..."
  cp "$NGINX_DEFAULT.bak" "$NGINX_DEFAULT"
  nginx -t 2>&1 && systemctl reload nginx
  exit 1
fi

systemctl reload nginx
echo "Nginx config updated and reloaded"
