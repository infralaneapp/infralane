#!/bin/sh
set -eu

echo "[infralane] Running database migrations..."
npx prisma migrate deploy

echo "[infralane] Seeding built-in data..."
npx prisma db seed || echo "[infralane] Seed skipped (may already exist)"

echo "[infralane] Starting server..."
exec node server.js
