import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// O Prisma 7 não carrega o .env automaticamente: carregamos aqui (se existir).
// Em produção as variáveis vêm do ambiente da plataforma.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Opcional para `prisma generate`; obrigatório para migrations.
    url: process.env.DATABASE_URL,
  },
});
