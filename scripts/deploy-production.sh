#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

command -v rsync >/dev/null || { echo "rsync is required" >&2; exit 1; }
if [ "${DEPLOY_LOCAL:-0}" != "1" ]; then
  : "${DEPLOY_HOST:?Set DEPLOY_HOST to the production server host}"
  : "${DEPLOY_USER:?Set DEPLOY_USER to the SSH deployment account}"
  command -v ssh >/dev/null || { echo "ssh is required" >&2; exit 1; }
fi

cd "$ROOT_DIR"
npm ci
npm run build
test -s dist/index.html

if [ "${DEPLOY_LOCAL:-0}" = "1" ]; then
 rsync -az --delete dist/ /opt/smart-mobility/workshop-portal/dist/
 bash "$ROOT_DIR/scripts/deploy-server.sh"
else
 REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"
 rsync -az --delete \
   --rsync-path="runuser -u smartmobility -- rsync" \
   -e "ssh -o BatchMode=yes -o StrictHostKeyChecking=yes" \
   dist/ "${REMOTE}:/opt/smart-mobility/workshop-portal/dist/"
 ssh -o BatchMode=yes -o StrictHostKeyChecking=yes "$REMOTE" \
   'bash -s' < "$ROOT_DIR/scripts/deploy-server.sh"
fi
