# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install libc compatibility shims for native modules
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args become env vars available at build time
ARG APP_DATABASE_URL
ARG AI_PROVIDER=gemini
ARG GOOGLE_API_KEY
ARG ANTHROPIC_API_KEY

ENV APP_DATABASE_URL=$APP_DATABASE_URL \
    AI_PROVIDER=$AI_PROVIDER \
    GOOGLE_API_KEY=$GOOGLE_API_KEY \
    ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000 \
    HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
