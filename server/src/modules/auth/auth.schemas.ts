import { z } from 'zod';
import { cleanText, emailField } from '../../shared/validation.js';

/** bcrypt considera no máximo 72 bytes — senhas maiores seriam truncadas. */
const MAX_PASSWORD_BYTES = 72;

export const passwordField = z
  .string({ error: 'Informe a senha.' })
  .min(8, 'A senha deve ter ao menos 8 caracteres.')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= MAX_PASSWORD_BYTES, 'A senha é longa demais.')
  .refine((value) => /[A-Za-zÀ-ÿ]/.test(value), 'A senha deve conter ao menos uma letra.')
  .refine((value) => /\d/.test(value), 'A senha deve conter ao menos um número.');

export const loginSchema = z.object({
  email: emailField,
  password: z
    .string({ error: 'Informe a senha.' })
    .min(1, 'Informe a senha.')
    .refine((value) => Buffer.byteLength(value, 'utf8') <= MAX_PASSWORD_BYTES, 'Senha inválida.'),
});

export const registerSchema = z.object({
  name: z
    .string({ error: 'Informe seu nome.' })
    .transform(cleanText)
    .pipe(z.string().min(3, 'Informe seu nome completo.').max(120, 'Nome muito longo.')),
  email: emailField,
  password: passwordField,
  registration: z
    .string({ error: 'Informe sua matrícula.' })
    .trim()
    .toUpperCase()
    .pipe(
      z
        .string()
        .min(3, 'A matrícula deve ter ao menos 3 caracteres.')
        .max(30, 'Matrícula muito longa.')
        .regex(/^[A-Z0-9./-]+$/, 'Use apenas letras, números, ponto, hífen ou barra.'),
    ),
  grade: z
    .string({ error: 'Informe sua turma.' })
    .transform(cleanText)
    .pipe(z.string().min(1, 'Informe sua turma.').max(40, 'Turma muito longa.')),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ error: 'Informe a senha atual.' })
      .min(1, 'Informe a senha atual.')
      .refine((value) => Buffer.byteLength(value, 'utf8') <= MAX_PASSWORD_BYTES, 'Senha inválida.'),
    newPassword: passwordField,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ['newPassword'],
    message: 'A nova senha deve ser diferente da atual.',
  });

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .transform(cleanText)
      .pipe(z.string().min(3, 'Informe seu nome completo.').max(120, 'Nome muito longo.'))
      .optional(),
    grade: z
      .string()
      .transform(cleanText)
      .pipe(z.string().min(1, 'Informe sua turma.').max(40, 'Turma muito longa.'))
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.grade !== undefined, 'Nenhuma alteração informada.');

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
