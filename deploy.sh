#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
CONTAINER="stoat-web-1"

echo "=== Compiling translations ==="
pnpm --filter client exec lingui compile --typescript

echo "=== Copying assets ==="
pnpm --filter client exec node scripts/copyAssets.mjs

echo "=== Running panda codegen ==="
pnpm --filter client exec panda codegen

echo "=== Building on host ==="
pnpm --filter client exec vite build

echo "=== Copying dist to container ==="
docker cp packages/client/dist/. "$CONTAINER":/app/dist/

echo "=== Restarting container ==="
docker restart "$CONTAINER"

echo "=== Done ==="
