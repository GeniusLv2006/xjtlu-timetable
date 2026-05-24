#!/usr/bin/env bash
# Run on VPS: bash deploy.sh
set -e

REPO_DIR="/root/xjtlu-timetable"
cd "$REPO_DIR"

echo "==> Pulling latest code..."
git pull

echo "==> Building and starting container..."
docker compose up -d --build

echo "==> Applying deployment hardening..."
bash backend/harden-deployment.sh

echo "==> Done. Container status:"
docker compose ps
