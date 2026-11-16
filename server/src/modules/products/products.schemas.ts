import { z } from 'zod';
import { IMAGE_KEY_PATTERN } from '../../lib/storage.js';
import { paginationQuery } from '../../shared/pagination.js';
import { cleanText, optionalSearch } from '../../shared/validation.js';

const nameField = z
  .string({ error: 'Informe o nome do produto.' })
  .transform(cleanText)
  .pipe(z.string().min(2, 'O nome deve ter ao menos 2 caracteres.').max(80, 'Nome muito longo.'));

const descriptionField = z
  .string()
  .transform(cleanText)
  .pipe(z.string().max(280, 'A descrição deve ter no máximo 280 caracteres.'));

const priceField = z
  .number({ error: 'Informe o preço.' })
  .positive('O preço deve ser maior que zero.')
  .max(9999.99, 'Preço acima do permitido.')
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, 'Use no máximo 2 casas decimais.');

const stockField = z
  .number({ error: 'Informe o estoque.' })
  .int('O estoque deve ser um número inteiro.')
  .min(0, 'O estoque não pode ser negativo.')
  .max(100_000, 'Estoque acima do permitido.');

const imageKeyField = z.string().regex(IMAGE_KEY_PATTERN, 'Imagem inválida.');

export const createProductSchema = z.object({
  name: nameField,
  description: descriptionField.optional(),
  price: priceField,
  categoryId: z.uuid({ error: 'Selecione uma categoria.' }),
  stock: stockField,
  isAvailable: z.boolean().optional(),
  imageKey: imageKeyField.nullable().optional(),
});

/** Atualização parcial — sem defaults para não sobrescrever campos omitidos. */
export const updateProductSchema = z
  .object({
    name: nameField.optional(),
    description: descriptionField.optional(),
    price: priceField.optional(),
    categoryId: z.uuid({ error: 'Selecione uma categoria.' }).optional(),
    stock: stockField.optional(),
    isAvailable: z.boolean().optional(),
    imageKey: imageKeyField.nullable().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), 'Nenhuma alteração informada.');

export const stockAdjustmentSchema = z.object({
  delta: z
    .number()
    .int()
    .min(-100_000)
    .max(100_000)
    .refine((value) => value !== 0, 'Informe um ajuste diferente de zero.'),
});

export const listProductsQuery = paginationQuery.extend({
  search: optionalSearch,
  categoryId: z.uuid().optional(),
  availability: z.enum(['available', 'unavailable', 'out_of_stock', 'low_stock']).optional(),
  sort: z.enum(['name', 'price', 'stock', 'createdAt']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuery>;
