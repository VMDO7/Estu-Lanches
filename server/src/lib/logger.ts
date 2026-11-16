import { pino } from 'pino';
import { env, isDevelopment } from '../config/env.js';

/**
 * Logger estruturado (JSON em produção → pronto para agregadores como
 * Loki, Datadog ou CloudWatch). Dados sensíveis são mascarados.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'estulanches-api' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, singleLine: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname,service' },
    },
  }),
});
