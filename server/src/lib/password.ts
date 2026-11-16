import bcrypt from 'bcryptjs';

/** Custo do bcrypt (2^12 iterações ≈ 250 ms): equilíbrio entre segurança e latência. */
const BCRYPT_COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

let dummyHash: Promise<string> | undefined;

/**
 * Executa uma comparação "falsa" quando o e-mail não existe, para que o tempo
 * de resposta não revele quais contas estão cadastradas (timing attack).
 */
export async function simulatePasswordCheck(plain: string): Promise<void> {
  dummyHash ??= bcrypt.hash('estulanches::timing-guard', BCRYPT_COST);
  await bcrypt.compare(plain, await dummyHash);
}
