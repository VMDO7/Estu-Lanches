# syntax=docker/dockerfile:1
# =============================================================================
# EstuLanches API — imagem multi-stage
# Build a partir da RAIZ do monorepo (npm workspaces + lockfile único):
#   docker build -f server/Dockerfile -t estulanches-api .
#
# Targets:
#   runtime (padrão) → API compilada, só dependências de produção, usuário sem root
#   migrate          → aplica migrations e seeds (usa o Prisma CLI/tsx) e encerra
# =============================================================================

ARG NODE_VERSION=24

# --- Base -------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS base
# O schema engine do Prisma (migrations) depende do OpenSSL.
RUN apk add --no-cache openssl
WORKDIR /app

# --- Dependências completas (build + migrations) ------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
# --ignore-scripts: o postinstall (prisma generate) roda no estágio de build,
# quando o schema já foi copiado.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace server --include-workspace-root=false --ignore-scripts --no-audit --no-fund

# --- Build --------------------------------------------------------------------
FROM deps AS build
COPY server/ server/
RUN npm run build --workspace server

# --- Migrations + seeds (job de curta duração) --------------------------------
FROM build AS migrate
WORKDIR /app/server
COPY server/docker/migrate.sh /usr/local/bin/migrate.sh
RUN chmod +x /usr/local/bin/migrate.sh
USER node
CMD ["migrate.sh"]

# --- Runtime --------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
# --omit=optional/peer: o lockfile marca prisma e typescript como "devOptional"
# (peer opcional do @prisma/client); sem isso o CLI (~250 MB) entraria na imagem.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace server --include-workspace-root=false \
      --omit=dev --omit=optional --omit=peer --ignore-scripts --no-audit --no-fund

WORKDIR /app/server
# dist inclui o Prisma Client gerado (src/generated → dist/generated).
COPY --from=build /app/server/dist ./dist
RUN mkdir -p uploads && chown node:node uploads

USER node
ENV PORT=3333 UPLOADS_DIR=/app/server/uploads
EXPOSE 3333
VOLUME ["/app/server/uploads"]

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/health/ready" || exit 1

# node como PID 1 recebe SIGTERM diretamente → encerramento gracioso do server.ts.
CMD ["node", "dist/server.js"]
