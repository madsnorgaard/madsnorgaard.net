# Multi-stage Nuxt 3 build
# Stage 1: build
FROM node:25-alpine AS builder

WORKDIR /app

# Install deps first (layer cache)
COPY package*.json ./
RUN npm ci --frozen-lockfile

# Copy source and build
COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────────────

# Stage 2: production runner
FROM node:25-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy only built output
COPY --from=builder /app/.output ./

EXPOSE 3000

CMD ["node", "server/index.mjs"]
