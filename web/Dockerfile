# syntax=docker/dockerfile:1
# =============================================================================
# EstuLanches Web — build do Vite servido pelo nginx
# Build a partir da RAIZ do monorepo:
#   docker build -f web/Dockerfile -t estulanches-web .
#
# O nginx também faz proxy de /api e /uploads para a API: front e API ficam na
# mesma origem e o cookie de sessão (SameSite=Strict) funciona sem CORS.
# =============================================================================

ARG NODE_VERSION=24

# --- Build ----------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace web --include-workspace-root=false --no-audit --no-fund

COPY web/ web/
# URL da API embutida no bundle. Padrão: mesma origem, via proxy do nginx.
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build --workspace web

# --- Runtime --------------------------------------------------------------------
FROM nginx:1.29-alpine AS runtime
# Templates em /etc/nginx/templates passam por envsubst na inicialização.
COPY web/docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/web/dist /usr/share/nginx/html
ENV API_UPSTREAM=http://api:3333
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
