# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
# Use --force to overcome the 2026 registry sync issues we've seen
RUN npm install --force

COPY . .
RUN npm run build

# Stage 2: Production (Hardened)
FROM node:20-slim AS runner
WORKDIR /app

# OBT-11 / Least-Privilege: Create restricted user
RUN groupadd -r nodejs && useradd -r -g nodejs svelteuser

# Copy built assets with explicit ownership
COPY --from=builder --chown=svelteuser:nodejs /app/build ./build
COPY --from=builder --chown=svelteuser:nodejs /app/package.json ./
COPY --from=builder --chown=svelteuser:nodejs /app/node_modules ./node_modules

USER svelteuser

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "build"]