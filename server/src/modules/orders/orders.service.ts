import { env } from '../../config/env.js';
import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import type { AuthContext } from '../../shared/auth-context.js';
import { MAX_ITEM_QUANTITY } from '../../shared/constants.js';
import { conflict, forbidden, notFound, unprocessable } from '../../shared/errors.js';
import { sumMoney } from '../../shared/money.js';
import { paginate, type Paginated } from '../../shared/pagination.js';
import { startOfLocalDay } from '../../shared/time.js';
import { generateOrderCode } from './order-code.js';
import { ACTIVE_ORDER_STATUSES, FINAL_ORDER_STATUSES, ORDER_STATUS_LABELS, canTransition } from './order-status.js';
import { toOrderDto, type OrderDto } from './orders.mapper.js';
import { ordersRepository, type ReservedLine } from './orders.repository.js';
import type { CreateOrderInput, ListOrdersQuery, UpdateOrderStatusInput, UpdatePaymentInput } from './orders.schemas.js';

const MAX_CODE_ATTEMPTS = 5;

type UnavailableReason = 'NOT_FOUND' | 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK';

interface CartIssue {
  productId: string;
  name: string | null;
  reason: UnavailableReason;
  available: number;
  requested: number;
}

const ISSUE_MESSAGES: Record<UnavailableReason, string> = {
  NOT_FOUND: 'não está mais no cardápio',
  UNAVAILABLE: 'está indisponível no momento',
  OUT_OF_STOCK: 'esgotou',
  INSUFFICIENT_STOCK: 'não tem estoque suficiente',
};

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/** Une linhas repetidas do mesmo produto e ordena por ID (ordem fixa de bloqueio). */
function consolidateItems(items: CreateOrderInput['items']): Array<[string, number]> {
  const quantities = new Map<string, number>();
  for (const { productId, quantity } of items) {
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }
  for (const quantity of quantities.values()) {
    if (quantity > MAX_ITEM_QUANTITY) {
      throw unprocessable(`A quantidade máxima por produto é ${MAX_ITEM_QUANTITY}.`, undefined, 'QUANTITY_LIMIT');
    }
  }
  return [...quantities.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/** Pré-validação: lista todos os problemas do carrinho de uma vez (melhor UX). */
async function findCartIssues(lines: Array<[string, number]>): Promise<CartIssue[]> {
  const products = await ordersRepository.findProductsForCheckout(lines.map(([id]) => id));
  const byId = new Map(products.map((product) => [product.id, product]));
  const issues: CartIssue[] = [];

  for (const [productId, requested] of lines) {
    const product = byId.get(productId);
    let reason: UnavailableReason | null = null;

    if (!product || product.archivedAt) reason = 'NOT_FOUND';
    else if (!product.isAvailable || !product.category.isActive) reason = 'UNAVAILABLE';
    else if (product.stock === 0) reason = 'OUT_OF_STOCK';
    else if (product.stock < requested) reason = 'INSUFFICIENT_STOCK';

    if (reason) {
      issues.push({
        productId,
        name: product?.name ?? null,
        reason,
        available: product && !product.archivedAt ? product.stock : 0,
        requested,
      });
    }
  }
  return issues;
}

function cartConflict(issues: CartIssue[]) {
  const [first] = issues;
  const message =
    issues.length === 1 && first
      ? `${first.name ?? 'Um item'} ${ISSUE_MESSAGES[first.reason]}. Revise seu carrinho.`
      : 'Alguns itens do seu carrinho não estão mais disponíveis. Revise seu carrinho.';
  return conflict(message, { issues }, 'CART_UNAVAILABLE');
}

function buildListWhere(auth: AuthContext, query: ListOrdersQuery): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  if (auth.role === 'STUDENT') {
    // Estudantes só enxergam os próprios pedidos — filtro imposto no servidor.
    if (!auth.studentId) throw forbidden();
    where.studentId = auth.studentId;
  } else if (query.studentId) {
    where.studentId = query.studentId;
  }

  if (query.status?.length) {
    where.status = { in: query.status };
  } else if (query.scope === 'active') {
    where.status = { in: [...ACTIVE_ORDER_STATUSES] };
  } else if (query.scope === 'history') {
    where.status = { in: [...FINAL_ORDER_STATUSES] };
  }

  if (query.period !== 'all') {
    const daysAgo = { today: 0, '7d': 6, '30d': 29 }[query.period];
    where.createdAt = { gte: startOfLocalDay(env.APP_TIMEZONE, daysAgo) };
  }

  if (query.search) {
    const term = query.search.replace(/^#/, '');
    where.OR = [{ code: { contains: term.toUpperCase() } }];
    if (auth.role === 'ADMIN') {
      where.OR.push(
        { student: { user: { name: { contains: term, mode: 'insensitive' } } } },
        { student: { registration: { contains: term, mode: 'insensitive' } } },
      );
    }
  }

  return where;
}

export const ordersService = {
  /**
   * Finalização do pedido. Garantias:
   *  • preços e totais calculados no servidor (nunca confia no cliente);
   *  • estoque reservado de forma atômica dentro de uma transação;
   *  • snapshot de nome/preço em cada item (histórico imutável);
   *  • idempotência por (estudante, Idempotency-Key) contra cliques duplos.
   */
  async create(
    auth: AuthContext,
    input: CreateOrderInput,
    idempotencyKey?: string,
  ): Promise<{ order: OrderDto; replayed: boolean }> {
    const studentId = auth.studentId;
    if (auth.role !== 'STUDENT' || !studentId) {
      throw forbidden('Apenas estudantes podem fazer pedidos.');
    }

    if (idempotencyKey) {
      const existing = await ordersRepository.findByIdempotencyKey(studentId, idempotencyKey);
      if (existing) return { order: toOrderDto(existing), replayed: true };
    }

    const lines = consolidateItems(input.items);
    const issues = await findCartIssues(lines);
    if (issues.length > 0) throw cartConflict(issues);

    for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
      try {
        const order = await prisma.$transaction(
          async (tx) => {
            const reserved: ReservedLine[] = [];

            for (const [productId, quantity] of lines) {
              const snapshot = await ordersRepository.reserveStock(tx, productId, quantity);
              if (!snapshot) {
                // Outro pedido levou o estoque entre a pré-validação e a reserva.
                const [issue] = await findCartIssues([[productId, quantity]]);
                throw cartConflict([
                  issue ?? { productId, name: null, reason: 'OUT_OF_STOCK', available: 0, requested: quantity },
                ]);
              }
              reserved.push({ productId, productName: snapshot.name, unitPrice: snapshot.price, quantity });
            }

            const total = sumMoney(reserved.map((line) => line.unitPrice.times(line.quantity)));

            return ordersRepository.createOrder(tx, {
              code: generateOrderCode(),
              studentId,
              total,
              notes: input.notes,
              idempotencyKey,
              paymentMethod: input.paymentMethod,
              lines: reserved,
              createdById: auth.userId,
            });
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
            maxWait: 5_000,
            timeout: 10_000,
          },
        );

        return { order: toOrderDto(order), replayed: false };
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;

        // Requisição concorrente com a mesma chave venceu a corrida.
        if (idempotencyKey) {
          const existing = await ordersRepository.findByIdempotencyKey(studentId, idempotencyKey);
          if (existing) return { order: toOrderDto(existing), replayed: true };
        }
        // Caso contrário, colisão de código: tenta novamente com outro código.
        if (attempt === MAX_CODE_ATTEMPTS) throw error;
      }
    }

    throw new Error('Falha inesperada ao gerar o pedido.');
  },

  async list(auth: AuthContext, query: ListOrdersQuery): Promise<Paginated<OrderDto>> {
    const { items, total } = await ordersRepository.list(buildListWhere(auth, query), query.sort, query);
    return paginate(items.map(toOrderDto), total, query);
  },

  async get(auth: AuthContext, id: string): Promise<OrderDto> {
    const order = await ordersRepository.findById(id);
    // 404 (e não 403) para pedidos de terceiros: não revela que o ID existe.
    if (!order || (auth.role === 'STUDENT' && order.studentId !== auth.studentId)) {
      throw notFound('Pedido não encontrado.');
    }
    return toOrderDto(order);
  },

  async updateStatus(auth: AuthContext, id: string, input: UpdateOrderStatusInput): Promise<OrderDto> {
    await prisma.$transaction(async (tx) => {
      const current = await ordersRepository.lockOrder(tx, id);
      if (!current || (auth.role === 'STUDENT' && current.studentId !== auth.studentId)) {
        throw notFound('Pedido não encontrado.');
      }

      if (auth.role === 'STUDENT' && (input.status !== 'CANCELLED' || current.status !== 'RECEIVED')) {
        throw unprocessable(
          'Você só pode cancelar pedidos que ainda não entraram em preparo.',
          undefined,
          'CANCEL_NOT_ALLOWED',
        );
      }

      if (!canTransition(current.status, input.status)) {
        throw unprocessable(
          `Não é possível alterar o pedido de "${ORDER_STATUS_LABELS[current.status]}" para "${ORDER_STATUS_LABELS[input.status]}".`,
          { from: current.status, to: input.status },
          'INVALID_TRANSITION',
        );
      }

      if (input.status === 'CANCELLED') {
        await ordersRepository.restoreStock(tx, id);
        await tx.payment.updateMany({
          where: { orderId: id, status: 'PAID' },
          data: { status: 'REFUNDED', updatedById: auth.userId },
        });
        await tx.payment.updateMany({
          where: { orderId: id, status: 'PENDING' },
          data: { status: 'CANCELLED', updatedById: auth.userId },
        });
      }

      if (input.status === 'DELIVERED' && input.markAsPaid) {
        await tx.payment.updateMany({
          where: { orderId: id, status: 'PENDING' },
          data: { status: 'PAID', paidAt: new Date(), updatedById: auth.userId },
        });
      }

      await tx.order.update({
        where: { id },
        data: {
          status: input.status,
          statusHistory: {
            create: { status: input.status, changedById: auth.userId, note: input.note ?? null },
          },
        },
        select: { id: true },
      });
    });

    return this.get(auth, id);
  },

  async updatePayment(auth: AuthContext, id: string, input: UpdatePaymentInput): Promise<OrderDto> {
    await prisma.$transaction(async (tx) => {
      const current = await ordersRepository.lockOrder(tx, id);
      if (!current) throw notFound('Pedido não encontrado.');
      if (current.status === 'CANCELLED') {
        throw unprocessable('Pedidos cancelados não podem ter o pagamento alterado.', undefined, 'ORDER_CANCELLED');
      }

      const { count } = await tx.payment.updateMany({
        where: { orderId: id, status: { in: ['PENDING', 'PAID'] } },
        data: {
          status: input.status,
          paidAt: input.status === 'PAID' ? new Date() : null,
          updatedById: auth.userId,
        },
      });
      if (count === 0) {
        throw unprocessable('O pagamento deste pedido não pode mais ser alterado.', undefined, 'PAYMENT_LOCKED');
      }
    });

    return this.get(auth, id);
  },
};
