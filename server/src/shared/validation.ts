import { z } from 'zod';

// Mensagens de validação padrão em português do Brasil.
z.config(z.locales.ptBR());

/** Remove caracteres de controle e espaços extras de textos livres. */
export const cleanText = (value: string) =>
  value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const uuidParam = z.object({
  id: z.uuid({ error: 'Identificador inválido.' }),
});

export const emailField = z
  .string({ error: 'Informe o e-mail.' })
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email({ error: 'E-mail inválido.' }));

export const optionalSearch = z
  .string()
  .trim()
  .max(80)
  .optional()
  .transform((value) => (value ? value : undefined));

/** Aceita "true"/"false" vindos de query string. */
export const booleanQuery = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === 'true'));
