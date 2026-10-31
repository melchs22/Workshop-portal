#!/usr/bin/env bash
set -euo pipefail

test -s /opt/smart-mobility/workshop-portal/dist/index.html
status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
  --retry 5 --retry-connrefused --retry-delay 2 \
  https://smartmobilityroadcare.com/workshop/)"
case "$status" in
  2??|3??) printf 'Workshop portal deployed; public route returned HTTP %s\n' "$status" ;;
  *) printf 'Workshop portal health check failed with HTTP %s\n' "$status" >&2; exit 1 ;;
esac
