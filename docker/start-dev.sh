#!/bin/sh
set -eu

if [ ! -d node_modules ] || [ ! -x node_modules/.bin/next ]; then
  npm install
fi

npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed

exec npx next dev --hostname 0.0.0.0 --port 3000
