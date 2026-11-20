# =============================================================================
# Stage 1: Build Next.js Persistent Studio UI & NestJS Host API
# =============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# =============================================================================
# Stage 2: Production Runtime (Railway / Render / Fly.io / Cloud Run)
# =============================================================================
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3333

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE 3333
CMD ["node", "dist/main"]
