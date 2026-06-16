#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
CONTAINER="stoat-web-1"

echo "=== Building on host ==="
pnpm --filter client exec vite build

echo "=== Copying dist to container ==="
docker cp packages/client/dist/. "$CONTAINER":/app/dist/

echo "=== Restarting container ==="
docker restart "$CONTAINER"

echo "=== Done ==="
