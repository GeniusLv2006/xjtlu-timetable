#!/usr/bin/env bash
# Run on VPS: bash deploy.sh
set -e

REPO_DIR="/root/xjtlu-timetable"
cd "$REPO_DIR"

echo "==> Pulling latest code..."
git pull

echo "==> Pulling and starting reviewed container image..."
docker compose pull
docker compose up -d --no-build

echo "==> Applying deployment hardening..."
bash backend/harden-deployment.sh

echo "==> Done. Container status:"
docker compose ps
