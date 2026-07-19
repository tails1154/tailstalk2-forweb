#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

REMOTE_HOST="tails1154.com"
REMOTE_PORT="1699"
REMOTE_USER="tails1154"
REMOTE_COMPOSE_DIR="/home/tails1154/stoat"
LOCAL_DIST="packages/client/dist"
CONTAINER="stoat-web-1"

echo "=== Compiling translations ==="
pnpm --filter client exec lingui compile --typescript

echo "=== Copying assets ==="
pnpm --filter client exec node scripts/copyAssets.mjs

echo "=== Running panda codegen ==="
pnpm --filter client exec panda codegen

echo "=== Building on host ==="
pnpm --filter client exec vite build

echo "=== Taring dist ==="
tar czf /tmp/stoat-dist.tar.gz -C "$LOCAL_DIST" .

echo "=== Uploading to $REMOTE_HOST ==="
scp -P "$REMOTE_PORT" /tmp/stoat-dist.tar.gz "$REMOTE_USER@$REMOTE_HOST:/tmp/"

echo "=== Deploying on remote ==="
ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" "
  set -e
  cd $REMOTE_COMPOSE_DIR
  rm -rf /tmp/stoat-dist
  mkdir -p /tmp/stoat-dist
  tar xzf /tmp/stoat-dist.tar.gz -C /tmp/stoat-dist
  docker cp /tmp/stoat-dist/. $CONTAINER:/app/dist/
  docker restart $CONTAINER
  rm -rf /tmp/stoat-dist /tmp/stoat-dist.tar.gz
"

rm -f /tmp/stoat-dist.tar.gz

echo "=== Done ==="
