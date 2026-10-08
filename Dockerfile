# CryptoThreads: Next.js storefront + render pipeline (satori/resvg/sharp) + Prisma.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=3000 STORAGE_DIR=/data/cache NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app ./
RUN mkdir -p /data/cache && chown -R node:node /data
USER node
EXPOSE 3000
# Apply the schema, then serve. `db push` is idempotent and never drops data without --accept-data-loss.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx next start -p 3000"]
