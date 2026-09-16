# ── Stage 1: Build React / Vite client ──────────────────────────────────────
FROM node:20-alpine AS client-build
WORKDIR /build

# Vite bakes these in at build time — passed as --build-arg from GitHub Actions
ARG VITE_API_URL=/api
ARG VITE_APP_NAME="SBG Scheduler"
ARG VITE_APP_VERSION=1.0.0
ARG VITE_AUTH0_DOMAIN
ARG VITE_AUTH0_CLIENT_ID
ARG VITE_AUTH0_AUDIENCE
ARG VITE_AUTH0_ROLES_CLAIM
ARG VITE_AUTH_ENABLED=true

ENV VITE_API_URL=$VITE_API_URL \
    VITE_APP_NAME=$VITE_APP_NAME \
    VITE_APP_VERSION=$VITE_APP_VERSION \
    VITE_AUTH0_DOMAIN=$VITE_AUTH0_DOMAIN \
    VITE_AUTH0_CLIENT_ID=$VITE_AUTH0_CLIENT_ID \
    VITE_AUTH0_AUDIENCE=$VITE_AUTH0_AUDIENCE \
    VITE_AUTH0_ROLES_CLAIM=$VITE_AUTH0_ROLES_CLAIM \
    VITE_AUTH_ENABLED=$VITE_AUTH_ENABLED

COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build
# Output at: /build/dist


# ── Stage 2: Compile TypeScript server ──────────────────────────────────────
FROM node:20-alpine AS server-build
WORKDIR /build

COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build
# Output at: /build/dist/index.js  (tsconfig outDir: ./dist)


# ── Stage 3: Production image ────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Production server dependencies only (no devDeps)
COPY server/package*.json ./
RUN npm ci --omit=dev

# Compiled server JS
COPY --from=server-build /build/dist ./dist

# Vite build → served as static files by Express via the block you added above
COPY --from=client-build /build/dist ./public

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]