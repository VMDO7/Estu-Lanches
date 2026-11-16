import type { OrderStatus } from '../../generated/prisma/enums.js';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  RECEIVED: 'Recebido',
  PREPARING: 'Em preparação',
  READY: 'Pronto para retirada',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export const ACTIVE_ORDER_STATUSES = ['RECEIVED', 'PREPARING', 'READY'] as const satisfies readonly OrderStatus[];
export const FINAL_ORDER_STATUSES = ['DELIVERED', 'CANCELLED'] as const satisfies readonly OrderStatus[];

/**
 * Máquina de estados do pedido. O fluxo só avança; cancelamento é possível
 * até a entrega. DELIVERED e CANCELLED são estados finais.
 */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  RECEIVED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
