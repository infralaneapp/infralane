#!/bin/sh
set -eu

echo "[infralane] Running database migrations..."
npx prisma migrate deploy

echo "[infralane] Seeding built-in automation rules and templates..."
npx tsx prisma/seed-production.ts || echo "[infralane] Seed skipped"

echo "[infralane] Starting server..."
exec node server.js
