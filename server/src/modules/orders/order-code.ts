import { randomInt } from 'node:crypto';

/** 32 símbolos sem caracteres ambíguos (0/O, 1/I) — fácil de ditar no balcão. */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 6;

/**
 * Código curto, aleatório e não sequencial (não revela volume de vendas).
 * A unicidade é garantida pelo índice único; colisões são raras e tratadas
 * com nova tentativa no serviço.
 */
export function generateOrderCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}
