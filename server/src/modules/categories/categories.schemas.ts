import { z } from 'zod';
import { booleanQuery, cleanText } from '../../shared/validation.js';

const nameField = z
  .string({ error: 'Informe o nome da categoria.' })
  .transform(cleanText)
  .pipe(z.string().min(2, 'O nome deve ter ao menos 2 caracteres.').max(60, 'Nome muito longo.'));

export const createCategorySchema = z.object({
  name: nameField,
  isActive: z.boolean().optional(),
});

export const updateCategorySchema = z
  .object({
    name: nameField.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.name !== undefined || data.isActive !== undefined, 'Nenhuma alteração informada.');

export const reorderCategoriesSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(100),
});

export const listCategoriesQuery = z.object({
  includeInactive: booleanQuery,
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
