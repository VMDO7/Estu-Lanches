import { existsSync } from 'node:fs';
import { z } from 'zod';

// Em desenvolvimento lemos o arquivo .env; em produção as variáveis
// são injetadas pela plataforma (container, orquestrador, CI).
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const booleanFromString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

/** Aceita "true"/"false", número de saltos (ex.: "1") ou lista de IPs/sub-redes. */
const trustProxy = z
  .string()
  .default('false')
  .transform((value): boolean | number | string => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    const hops = Number(value);
    return Number.isInteger(hops) ? hops : value;
  });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  APP_TIMEZONE: z
    .string()
    .default('America/Sao_Paulo')
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat('pt-BR', { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, 'APP_TIMEZONE inválido'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET deve ter ao menos 32 caracteres'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  TRUST_PROXY: trustProxy,

  UPLOADS_DIR: z.string().default('uploads'),
  PUBLIC_UPLOADS_URL: z
    .string()
    .default('/uploads')
    .transform((url) => url.replace(/\/+$/, '')),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().max(10).default(2),

  DEMO_MODE: booleanFromString.default(false),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
