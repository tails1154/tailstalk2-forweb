#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

REMOTE_HOST="tails1154.com"
REMOTE_PORT="1699"
REMOTE_USER="tails1154"
REMOTE_COMPOSE_DIR="/home/tails1154/stoat"
REMOTE_DEPLOY_DIR="/home/tails1154/.tailstalk2-deploy"
LOCAL_DIST="packages/client/dist"
LOCAL_VERSION="packages/client/public/tailstalk2.version"
LOCAL_VERSION_CGI="scripts/tailstalk2_version.py"
LOCAL_RPC_DIR="extensions/tailstalk2-rpc"
RPC_VERSION="1.0.0"
CONTAINER="stoat-web-1"
DEPLOY_TMP_DIR="$PWD/.deploy-tmp"
DIST_ARCHIVE="$DEPLOY_TMP_DIR/stoat-dist.tar.gz"
RPC_ARCHIVE="$DEPLOY_TMP_DIR/tailstalk2-rpc-${RPC_VERSION}.zip"

mkdir -p "$DEPLOY_TMP_DIR"
trap 'rm -rf "$DEPLOY_TMP_DIR"' EXIT

echo "=== Compiling translations ==="
pnpm --filter client exec lingui compile --typescript

echo "=== Copying assets ==="
pnpm --filter client exec node scripts/copyAssets.mjs

echo "=== Running panda codegen ==="
pnpm --filter client exec panda codegen

echo "=== Building stoat.js client library ==="
pnpm --filter stoat.js exec tsc

echo "=== Building on host ==="
# Vite can leave hashed assets from earlier builds behind in this workspace.
# Clear only the generated client output so remote deploys never accumulate
# stale source maps and old bundles.
rm -rf "$LOCAL_DIST"
mkdir -p "$LOCAL_DIST"
NODE_OPTIONS="--max-old-space-size=4096" pnpm --filter client exec vite build
echo "=== Removing production source maps ==="
find "$LOCAL_DIST" -type f -name '*.map' -delete

echo "=== Taring dist ==="
rm -f "$DIST_ARCHIVE"
tar czf "$DIST_ARCHIVE" -C "$LOCAL_DIST" .

echo "=== Packaging browser RPC extension ==="
test -f "$LOCAL_RPC_DIR/manifest.json"
test -f "$LOCAL_RPC_DIR/update.xml"
rm -f "$RPC_ARCHIVE"
(
  cd "$LOCAL_RPC_DIR"
  zip -qr "$RPC_ARCHIVE" .
)

echo "=== Uploading to $REMOTE_HOST ==="
ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" "mkdir -p '$REMOTE_DEPLOY_DIR'"
scp -P "$REMOTE_PORT" "$DIST_ARCHIVE" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DEPLOY_DIR/stoat-dist.tar.gz"
scp -P "$REMOTE_PORT" "$LOCAL_VERSION" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DEPLOY_DIR/tailstalk2.version"
scp -P "$REMOTE_PORT" "$LOCAL_VERSION_CGI" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DEPLOY_DIR/tailstalk2_version.py"
scp -P "$REMOTE_PORT" "$RPC_ARCHIVE" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DEPLOY_DIR/tailstalk2-rpc-${RPC_VERSION}.zip"
scp -P "$REMOTE_PORT" "$LOCAL_RPC_DIR/update.xml" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DEPLOY_DIR/tailstalk2-rpc-update.xml"

echo "=== Deploying on remote ==="
ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" "
  set -e
  cd $REMOTE_COMPOSE_DIR
  rm -rf '$REMOTE_DEPLOY_DIR/stoat-dist'
  mkdir -p '$REMOTE_DEPLOY_DIR/stoat-dist'
  tar xzf '$REMOTE_DEPLOY_DIR/stoat-dist.tar.gz' -C '$REMOTE_DEPLOY_DIR/stoat-dist'
  rm -rf /app/dist/\* /app/dist_injected
  docker cp '$REMOTE_DEPLOY_DIR/stoat-dist/.' $CONTAINER:/app/dist/
  docker restart $CONTAINER
  mkdir -p /home/tails1154/ecraft
  cp '$REMOTE_DEPLOY_DIR/tailstalk2.version' /home/tails1154/ecraft/tailstalk2.version
  install -m 755 '$REMOTE_DEPLOY_DIR/tailstalk2_version.py' /home/tails1154/ecraft/cgi-bin/tailstalk2_version.py
  mkdir -p /home/tails1154/ecraft/tailstalk2-rpc
  install -m 644 '$REMOTE_DEPLOY_DIR/tailstalk2-rpc-${RPC_VERSION}.zip' /home/tails1154/ecraft/tailstalk2-rpc/tailstalk2-rpc-${RPC_VERSION}.zip
  install -m 644 '$REMOTE_DEPLOY_DIR/tailstalk2-rpc-update.xml' /home/tails1154/ecraft/tailstalk2-rpc/update.xml
  rm -rf '$REMOTE_DEPLOY_DIR'
"

echo "=== Done ==="
