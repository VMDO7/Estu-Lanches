import type { OrderStatus, PaymentMethod, PaymentStatus, Role } from '../../generated/prisma/enums.js';
import { imageUrlFor } from '../../lib/storage.js';
import { toMoney } from '../../shared/money.js';
import type { OrderWithHistory, OrderWithRelations } from './orders.repository.js';

export interface OrderDto {
  id: string;
  code: string;
  status: OrderStatus;
  total: number;
  notes: string | null;
  itemsCount: number;
  createdAt: Date;
  updatedAt: Date;
  student: { id: string; name: string; email: string; registration: string; grade: string };
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
    imageUrl: string | null;
    categorySlug: string;
  }>;
  payment: { method: PaymentMethod; status: PaymentStatus; amount: number; paidAt: Date | null } | null;
  statusHistory?: Array<{
    id: string;
    status: OrderStatus;
    note: string | null;
    createdAt: Date;
    changedBy: { name: string; role: Role } | null;
  }>;
}

function hasHistory(order: OrderWithRelations | OrderWithHistory): order is OrderWithHistory {
  return 'statusHistory' in order;
}

export function toOrderDto(order: OrderWithRelations | OrderWithHistory): OrderDto {
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    total: toMoney(order.total),
    notes: order.notes,
    itemsCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    student: {
      id: order.student.id,
      name: order.student.user.name,
      email: order.student.user.email,
      registration: order.student.registration,
      grade: order.student.grade,
    },
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      unitPrice: toMoney(item.unitPrice),
      quantity: item.quantity,
      subtotal: toMoney(item.unitPrice.times(item.quantity)),
      imageUrl: imageUrlFor(item.product.imageKey),
      categorySlug: item.product.category.slug,
    })),
    payment: order.payment
      ? {
          method: order.payment.method,
          status: order.payment.status,
          amount: toMoney(order.payment.amount),
          paidAt: order.payment.paidAt,
        }
      : null,
    ...(hasHistory(order) && {
      statusHistory: order.statusHistory.map((entry) => ({
        id: entry.id,
        status: entry.status,
        note: entry.note,
        createdAt: entry.createdAt,
        changedBy: entry.changedBy,
      })),
    }),
  };
}
