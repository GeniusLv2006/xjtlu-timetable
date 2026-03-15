#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
./pocketbase serve \
  --http=127.0.0.1:8091 \
  --publicDir=../frontend/dist \
  --dir=./pb_data \
  --hooksDir=./pb_hooks
