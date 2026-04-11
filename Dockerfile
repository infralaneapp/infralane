FROM node:20-bookworm-slim AS base

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# --- Dependencies ---
FROM base AS deps
COPY package*.json ./
RUN npm ci

# --- Builder ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- Production ---
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma (migrations + seed + client)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Worker + modules (for standalone worker and seed)
COPY --from=builder /app/worker.ts ./worker.ts
COPY --from=builder /app/modules ./modules
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/docker ./docker

EXPOSE 3000

CMD ["node", "server.js"]
