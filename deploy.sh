#!/usr/bin/env bash
# Run on VPS: bash deploy.sh
set -e

REPO_DIR="/root/xjtlu-timetable"
cd "$REPO_DIR"

echo "==> Pulling latest code..."
git pull

echo "==> Building frontend..."
cd frontend
pnpm install --frozen-lockfile
pnpm build
cd ..

echo "==> Restarting service..."
systemctl restart xjtlu-timetable

echo "==> Done. Service status:"
systemctl status xjtlu-timetable --no-pager
