import { z } from 'zod';
import { OrderStatus, PaymentMethod } from '../../generated/prisma/enums.js';
import { MAX_ITEM_QUANTITY, MAX_ORDER_LINES } from '../../shared/constants.js';
import { paginationQuery } from '../../shared/pagination.js';
import { cleanText, optionalSearch } from '../../shared/validation.js';

const ORDER_STATUS_VALUES = new Set<string>(Object.values(OrderStatus));

const optionalNote = z
  .string()
  .transform(cleanText)
  .pipe(z.string().max(200, 'A observação deve ter no máximo 200 caracteres.'))
  .optional()
  .transform((value) => value || undefined);

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.uuid({ error: 'Produto inválido.' }),
        quantity: z
          .number({ error: 'Quantidade inválida.' })
          .int('Quantidade inválida.')
          .min(1, 'A quantidade mínima é 1.')
          .max(MAX_ITEM_QUANTITY, `A quantidade máxima por item é ${MAX_ITEM_QUANTITY}.`),
      }),
    )
    .min(1, 'Seu carrinho está vazio.')
    .max(MAX_ORDER_LINES, 'Itens demais em um único pedido.'),
  paymentMethod: z.enum(PaymentMethod, { error: 'Selecione uma forma de pagamento válida.' }),
  notes: optionalNote,
});

/** Header Idempotency-Key: gerado pelo cliente a cada intenção de compra. */
export const idempotencyKeySchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{8,64}$/, 'Idempotency-Key inválida.')
  .optional();

const statusListQuery = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (!value) return undefined;
    const statuses = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (!statuses.every((status) => ORDER_STATUS_VALUES.has(status))) {
      ctx.addIssue({ code: 'custom', message: 'Status de pedido inválido.' });
      return z.NEVER;
    }
    return statuses as OrderStatus[];
  });

export const listOrdersQuery = paginationQuery.extend({
  status: statusListQuery,
  scope: z.enum(['active', 'history', 'all']).default('all'),
  period: z.enum(['today', '7d', '30d', 'all']).default('all'),
  search: optionalSearch,
  studentId: z.uuid().optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(OrderStatus, { error: 'Status inválido.' }),
  note: optionalNote,
  /** Ao entregar, registra o pagamento como recebido. */
  markAsPaid: z.boolean().optional(),
});

export const updatePaymentSchema = z.object({
  status: z.enum(['PENDING', 'PAID'], { error: 'Status de pagamento inválido.' }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuery>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
