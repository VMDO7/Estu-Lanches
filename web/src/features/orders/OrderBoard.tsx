import { Clock, Inbox, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { formatCurrency, formatOrderCode, minutesSince } from '@/lib/format';
import type { Order, OrderStatus } from '@/types/api';
import { PAYMENT_METHOD, NEXT_ACTION, ORDER_STATUS } from './order-status';

/** Minutos a partir dos quais o pedido é destacado como atrasado, por etapa. */
const LATE_AFTER_MINUTES: Partial<Record<OrderStatus, number>> = { RECEIVED: 5, PREPARING: 15, READY: 20 };

const COLUMN_STYLES: Record<string, { bar: string; icon: string }> = {
  RECEIVED: { bar: 'bg-sky-500', icon: 'bg-sky-50 text-sky-700 ring-sky-100' },
  PREPARING: { bar: 'bg-amber-500', icon: 'bg-amber-50 text-amber-700 ring-amber-100' },
  READY: { bar: 'bg-brand-500', icon: 'bg-brand-50 text-brand-700 ring-brand-100' },
};

interface OrderBoardProps {
  orders: Order[];
  now: number;
  onOpen: (orderId: string) => void;
  onAdvance: (order: Order) => void;
  pendingOrderId: string | null;
}

/** Quadro operacional: uma coluna por etapa, pedidos mais antigos primeiro (fila FIFO). */
export function OrderBoard({ orders, now, onOpen, onAdvance, pendingOrderId }: OrderBoardProps) {
  const columns: OrderStatus[] = ['RECEIVED', 'PREPARING', 'READY'];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {columns.map((status) => {
        const config = ORDER_STATUS[status];
        const Icon = config.icon;
        const columnOrders = orders.filter((order) => order.status === status);
        const styles = COLUMN_STYLES[status]!;

        return (
          <section
            key={status}
            aria-label={`${config.label}: ${columnOrders.length} pedidos`}
            className="flex min-h-64 flex-col rounded-2xl border border-ink-200/70 bg-ink-50/70"
          >
            <header className="relative flex items-center justify-between gap-2 px-4 pt-4 pb-3">
              <span className={cn('absolute inset-x-4 top-0 h-0.5 rounded-b-full', styles.bar)} aria-hidden />
              <div className="flex items-center gap-2.5">
                <span className={cn('flex size-8 items-center justify-center rounded-lg ring-1', styles.icon)}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <h2 className="text-sm font-semibold text-ink-900">{config.label}</h2>
              </div>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-ink-700 shadow-xs ring-1 ring-ink-200/70 tabular-nums">
                {columnOrders.length}
              </span>
            </header>

            <div className="flex flex-1 flex-col gap-3 px-3 pb-3">
              {columnOrders.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 px-4 py-10 text-center">
                  <Inbox className="mb-2 size-5 text-ink-300" aria-hidden />
                  <p className="text-[13px] text-ink-400">Nenhum pedido nesta etapa</p>
                </div>
              ) : (
                columnOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    now={now}
                    onOpen={() => onOpen(order.id)}
                    onAdvance={() => onAdvance(order)}
                    advancing={pendingOrderId === order.id}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

interface OrderCardProps {
  order: Order;
  now: number;
  onOpen: () => void;
  onAdvance: () => void;
  advancing: boolean;
}

function OrderCard({ order, now, onOpen, onAdvance, advancing }: OrderCardProps) {
  const minutes = minutesSince(order.createdAt, now);
  const lateAfter = LATE_AFTER_MINUTES[order.status] ?? Infinity;
  const late = minutes >= lateAfter;
  const next = NEXT_ACTION[order.status];
  const visibleItems = order.items.slice(0, 4);
  const hiddenCount = order.items.length - visibleItems.length;
  const PaymentIcon = order.payment ? PAYMENT_METHOD[order.payment.method].icon : null;

  return (
    <article className="group relative animate-scale-in rounded-xl border border-ink-200/80 bg-white p-4 shadow-card transition-shadow hover:shadow-soft">
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 rounded-xl"
        aria-label={`Ver detalhes do pedido ${formatOrderCode(order.code)}`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[15px] font-semibold tracking-tight text-ink-950">{formatOrderCode(order.code)}</p>
          <p className="mt-0.5 truncate text-[13px] text-ink-600">
            {order.student.name} <span className="text-ink-400">· {order.student.grade}</span>
          </p>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
            late ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-ink-100 text-ink-600',
          )}
          title={late ? 'Pedido aguardando além do esperado' : undefined}
        >
          <Clock className="size-3" aria-hidden />
          {minutes < 1 ? 'agora' : `${minutes} min`}
        </span>
      </div>

      <ul className="mt-3 space-y-1">
        {visibleItems.map((item) => (
          <li key={item.id} className="flex gap-2 text-[13px] text-ink-700">
            <span className="w-6 shrink-0 font-semibold text-brand-700 tabular-nums">{item.quantity}×</span>
            <span className="truncate">{item.productName}</span>
          </li>
        ))}
        {hiddenCount > 0 && <li className="pl-8 text-xs text-ink-500">+ {hiddenCount} outros itens</li>}
      </ul>

      {order.notes && (
        <p className="mt-3 flex gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
          <StickyNote className="mt-px size-3.5 shrink-0 text-amber-600" aria-hidden />
          <span className="line-clamp-2">{order.notes}</span>
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-100 pt-3">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="font-semibold text-ink-900 tabular-nums">{formatCurrency(order.total)}</span>
          {PaymentIcon && order.payment && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs',
                order.payment.status === 'PAID' ? 'text-emerald-700' : 'text-ink-500',
              )}
              title={`${PAYMENT_METHOD[order.payment.method].label} · ${order.payment.status === 'PAID' ? 'pago' : 'pendente'}`}
            >
              <PaymentIcon className="size-3.5" aria-hidden />
              {order.payment.status === 'PAID' ? 'Pago' : PAYMENT_METHOD[order.payment.method].label}
            </span>
          )}
        </div>
        {next && (
          <Button size="sm" className="relative z-10" onClick={onAdvance} loading={advancing}>
            {next.label}
          </Button>
        )}
      </div>
    </article>
  );
}
