# Builder
FROM docker.io/oven/bun:1-alpine AS builder
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

COPY src/ src/
COPY server.ts ./
COPY tsconfig.json ./
COPY package.json ./

RUN bunx buntok build

# Production
FROM docker.io/oven/bun:1-alpine
WORKDIR /app

COPY --from=builder /app/.buntok .buntok
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/package.json ./

EXPOSE 1212

ENV NODE_ENV=production
ENV PORT=1212

CMD ["bun", ".buntok/server.js"]
