# ============================================================
# Stage 1: Dependencies
# ============================================================
FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --only=production

# ============================================================
# Stage 2: Builder
# ============================================================
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Build-time args — NEXT_PUBLIC_* are inlined into the JS bundle
ARG SHOPIFY_STORE_DOMAIN
ARG SHOPIFY_STOREFRONT_ACCESS_TOKEN
ARG SHOPIFY_STOREFRONT_PRIVATE_TOKEN
ARG SHOPIFY_API_VERSION
ARG SHOPIFY_CLIENT_ID
ARG SHOPIFY_CLIENT_SECRET
ARG ADMIN_CHAT_PASSWORD
ARG NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
ARG NEXT_PUBLIC_SHOPIFY_API_VERSION
ARG NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN

ENV SHOPIFY_STORE_DOMAIN=$SHOPIFY_STORE_DOMAIN
ENV SHOPIFY_STOREFRONT_ACCESS_TOKEN=$SHOPIFY_STOREFRONT_ACCESS_TOKEN
ENV SHOPIFY_STOREFRONT_PRIVATE_TOKEN=$SHOPIFY_STOREFRONT_PRIVATE_TOKEN
ENV SHOPIFY_API_VERSION=$SHOPIFY_API_VERSION
ENV SHOPIFY_CLIENT_ID=$SHOPIFY_CLIENT_ID
ENV SHOPIFY_CLIENT_SECRET=$SHOPIFY_CLIENT_SECRET
ENV ADMIN_CHAT_PASSWORD=$ADMIN_CHAT_PASSWORD
ENV NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=$NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
ENV NEXT_PUBLIC_SHOPIFY_API_VERSION=$NEXT_PUBLIC_SHOPIFY_API_VERSION
ENV NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN=$NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ============================================================
# Stage 3: Production runner (~150MB)
# ============================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
