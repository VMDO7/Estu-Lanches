#!/bin/sh
# Aplica migrations pendentes e os seeds idempotentes. Executado pelo serviço
# "migrate" do docker-compose antes de a API subir.
set -eu

echo "→ Aplicando migrations…"
npx prisma migrate deploy

echo "→ Seed base (categorias + administrador)…"
npm run db:seed

if [ "${SEED_DEMO:-false}" = "true" ]; then
  echo "→ Seed de demonstração…"
  # O seed de demonstração é bloqueado com NODE_ENV=production.
  NODE_ENV=development npm run db:seed:demo
fi

echo "✓ Banco pronto."
