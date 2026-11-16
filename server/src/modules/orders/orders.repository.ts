import type { Prisma } from '../../generated/prisma/client.js';
import type { OrderStatus, PaymentMethod } from '../../generated/prisma/enums.js';
import { prisma } from '../../lib/prisma.js';
import { toSkipTake, type PaginationQuery } from '../../shared/pagination.js';

export const orderListInclude = {
  student: {
    select: {
      id: true,
      registration: true,
      grade: true,
      user: { select: { name: true, email: true } },
    },
  },
  items: {
    orderBy: { productName: 'asc' },
    select: {
      id: true,
      productId: true,
      productName: true,
      unitPrice: true,
      quantity: true,
      product: { select: { imageKey: true, category: { select: { slug: true } } } },
    },
  },
  payment: { select: { method: true, status: true, amount: true, paidAt: true } },
} satisfies Prisma.OrderInclude;

export const orderDetailInclude = {
  ...orderListInclude,
  statusHistory: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      status: true,
      note: true,
      createdAt: true,
      changedBy: { select: { name: true, role: true } },
    },
  },
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderListInclude }>;
export type OrderWithHistory = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;

export interface ReservedLine {
  productId: string;
  productName: string;
  unitPrice: Prisma.Decimal;
  quantity: number;
}

interface NewOrder {
  code: string;
  studentId: string;
  total: Prisma.Decimal;
  notes?: string | undefined;
  idempotencyKey?: string | undefined;
  paymentMethod: PaymentMethod;
  lines: ReservedLine[];
  createdById: string;
}

export const ordersRepository = {
  findProductsForCheckout(productIds: string[]) {
    return prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        stock: true,
        isAvailable: true,
        archivedAt: true,
        category: { select: { isActive: true } },
      },
    });
  },

  /**
   * Reserva atômica de estoque. O UPDATE condicional bloqueia a linha do
   * produto e reavalia `stock >= quantidade` sobre a versão mais recente:
   * entre duas compras simultâneas da última unidade, apenas uma afeta a
   * linha — a outra recebe zero linhas e o pedido é recusado.
   * O RETURNING captura nome e preço no mesmo instante (snapshot da venda).
   */
  async reserveStock(tx: Prisma.TransactionClient, productId: string, quantity: number) {
    const rows = await tx.$queryRaw<Array<{ name: string; price: Prisma.Decimal }>>`
      UPDATE products AS p
         SET stock = p.stock - ${quantity}::int, updated_at = NOW()
        FROM categories AS c
       WHERE p.id = ${productId}::uuid
         AND c.id = p.category_id
         AND c.is_active
         AND p.is_available
         AND p.archived_at IS NULL
         AND p.stock >= ${quantity}::int
   RETURNING p.name, p.price`;
    return rows[0] ?? null;
  },

  createOrder(tx: Prisma.TransactionClient, order: NewOrder) {
    return tx.order.create({
      data: {
        code: order.code,
        studentId: order.studentId,
        total: order.total,
        notes: order.notes ?? null,
        idempotencyKey: order.idempotencyKey ?? null,
        items: {
          create: order.lines.map((line) => ({
            productId: line.productId,
            productName: line.productName,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
          })),
        },
        payment: { create: { method: order.paymentMethod, amount: order.total } },
        statusHistory: { create: { status: 'RECEIVED', changedById: order.createdById } },
      },
      include: orderDetailInclude,
    });
  },

  findByIdempotencyKey(studentId: string, idempotencyKey: string) {
    return prisma.order.findUnique({
      where: { studentId_idempotencyKey: { studentId, idempotencyKey } },
      include: orderDetailInclude,
    });
  },

  findById(id: string) {
    return prisma.order.findUnique({ where: { id }, include: orderDetailInclude });
  },

  async list(where: Prisma.OrderWhereInput, sort: 'newest' | 'oldest', pagination: PaginationQuery) {
    const [items, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        include: orderListInclude,
        orderBy: [{ createdAt: sort === 'newest' ? 'desc' : 'asc' }, { id: 'asc' }],
        ...toSkipTake(pagination),
      }),
      prisma.order.count({ where }),
    ]);
    return { items, total };
  },

  /** Bloqueia o pedido (SELECT … FOR UPDATE) para serializar mudanças de status. */
  async lockOrder(tx: Prisma.TransactionClient, id: string) {
    const rows = await tx.$queryRaw<Array<{ id: string; status: OrderStatus; studentId: string }>>`
      SELECT id, status::text AS status, student_id AS "studentId"
        FROM orders
       WHERE id = ${id}::uuid
         FOR UPDATE`;
    return rows[0] ?? null;
  },

  /** Devolve ao estoque os itens de um pedido cancelado (incremento atômico). */
  async restoreStock(tx: Prisma.TransactionClient, orderId: string) {
    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { productId: true, quantity: true },
      orderBy: { productId: 'asc' }, // ordem fixa de bloqueio evita deadlocks
    });
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
        select: { id: true },
      });
    }
  },
};
