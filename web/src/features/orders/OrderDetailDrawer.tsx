import { CircleCheck, Clock, Hash, GraduationCap, Mail, StickyNote, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog, Drawer } from '@/components/ui/Dialog';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Field, Textarea } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';
import { formatCurrency, formatDateTime, formatOrderCode, formatTime, minutesSince } from '@/lib/format';
import { useNow } from '@/lib/hooks';
import type { Order } from '@/types/api';
import { ProductImage } from '../products/ProductImage';
import { OrderStatusBadge, PaymentMethodLabel, PaymentStatusBadge } from './OrderBadges';
import { NEXT_ACTION, ORDER_STATUS, isActiveStatus } from './order-status';
import { useOrder, useUpdateOrderStatus, useUpdatePayment } from './orders.api';

interface OrderDetailDrawerProps {
  orderId: string | null;
  onClose: () => void;
}

export function OrderDetailDrawer({ orderId, onClose }: OrderDetailDrawerProps) {
  const { data: order, isLoading, error, refetch } = useOrder(orderId ?? undefined, { refetchInterval: 15_000 });
  const updateStatus = useUpdateOrderStatus();
  const updatePayment = useUpdatePayment();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [paidOnDelivery, setPaidOnDelivery] = useState(true);
  const now = useNow(30_000);

  const next = order ? NEXT_ACTION[order.status] : undefined;
  const paymentPending = order?.payment?.status === 'PENDING';

  const advance = () => {
    if (!order || !next) return;
    updateStatus.mutate({
      id: order.id,
      status: next.status,
      ...(next.status === 'DELIVERED' && paymentPending && { markAsPaid: paidOnDelivery }),
    });
  };

  const cancel = () => {
    if (!order) return;
    updateStatus.mutate(
      { id: order.id, status: 'CANCELLED', note: cancelReason.trim() || undefined },
      {
        onSuccess: () => {
          setCancelOpen(false);
          setCancelReason('');
        },
      },
    );
  };

  return (
    <>
      <Drawer
        open={!!orderId}
        onClose={onClose}
        width="lg"
        title={
          order ? (
            <span className="flex items-center gap-2.5">
              <span className="font-mono tracking-tight">{formatOrderCode(order.code)}</span>
              <OrderStatusBadge status={order.status} />
            </span>
          ) : (
            'Detalhes do pedido'
          )
        }
        description={
          order && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden />
              {formatDateTime(order.createdAt)}
              {isActiveStatus(order.status) && ` · aguardando há ${minutesSince(order.createdAt, now)} min`}
            </span>
          )
        }
        footer={
          order && isActiveStatus(order.status) ? (
            <div className="space-y-3">
              {next?.status === 'DELIVERED' && paymentPending && (
                <label className="flex items-center gap-2.5 rounded-lg bg-ink-50 px-3 py-2.5 text-[13px] text-ink-700">
                  <input
                    type="checkbox"
                    checked={paidOnDelivery}
                    onChange={(event) => setPaidOnDelivery(event.target.checked)}
                    className="size-4 rounded border-ink-300 accent-brand-600"
                  />
                  Pagamento recebido na entrega
                </label>
              )}
              <div className="flex gap-2">
                <Button variant="danger-soft" onClick={() => setCancelOpen(true)} disabled={updateStatus.isPending}>
                  Cancelar pedido
                </Button>
                {next && (
                  <Button className="flex-1" onClick={advance} loading={updateStatus.isPending && !cancelOpen}>
                    {next.label}
                  </Button>
                )}
              </div>
            </div>
          ) : undefined
        }
      >
        {isLoading && <DrawerSkeleton />}
        {error && <ErrorState error={error} onRetry={() => void refetch()} />}
        {order && (
          <OrderDetailBody
            order={order}
            onTogglePayment={(status) => updatePayment.mutate({ id: order.id, status })}
            paymentLoading={updatePayment.isPending}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={cancel}
        loading={updateStatus.isPending}
        title={`Cancelar o pedido ${order ? formatOrderCode(order.code) : ''}?`}
        description="Os itens voltam automaticamente para o estoque e o estudante verá o pedido como cancelado."
        confirmLabel="Cancelar pedido"
      >
        <Field label="Motivo (opcional)" htmlFor="cancel-reason" hint="Visível para o estudante.">
          <Textarea
            id="cancel-reason"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            maxLength={200}
            rows={2}
            placeholder="Ex.: produto em falta no momento"
          />
        </Field>
      </ConfirmDialog>
    </>
  );
}

function OrderDetailBody({
  order,
  onTogglePayment,
  paymentLoading,
}: {
  order: Order;
  onTogglePayment: (status: 'PENDING' | 'PAID') => void;
  paymentLoading: boolean;
}) {
  const canEditPayment = order.status !== 'CANCELLED' && order.payment && ['PENDING', 'PAID'].includes(order.payment.status);

  return (
    <div className="divide-y divide-ink-100">
      <section className="flex items-center gap-3.5 px-5 py-4">
        <Avatar name={order.student.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-900">{order.student.name}</p>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-500">
            <span className="inline-flex items-center gap-1">
              <GraduationCap className="size-3.5" aria-hidden /> {order.student.grade}
            </span>
            <span className="inline-flex items-center gap-1">
              <Hash className="size-3.5" aria-hidden /> {order.student.registration}
            </span>
            <span className="inline-flex items-center gap-1 truncate">
              <Mail className="size-3.5" aria-hidden /> {order.student.email}
            </span>
          </div>
        </div>
      </section>

      <section className="px-5 py-4">
        <h3 className="mb-3 text-xs font-semibold tracking-wider text-ink-500 uppercase">
          Itens ({order.itemsCount})
        </h3>
        <ul className="space-y-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <div className="size-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-ink-200/70">
                <ProductImage src={item.imageUrl} name={item.productName} categorySlug={item.categorySlug} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">
                  <span className="mr-1.5 font-semibold text-brand-700 tabular-nums">{item.quantity}×</span>
                  {item.productName}
                </p>
                <p className="text-xs text-ink-500 tabular-nums">{formatCurrency(item.unitPrice)} cada</p>
              </div>
              <span className="text-sm font-semibold text-ink-900 tabular-nums">{formatCurrency(item.subtotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-ink-50 px-4 py-3">
          <span className="text-sm font-medium text-ink-600">Total</span>
          <span className="text-lg font-semibold tracking-tight text-ink-950">{formatCurrency(order.total)}</span>
        </div>
        {order.notes && (
          <div className="mt-3 flex gap-2.5 rounded-xl border border-amber-200/70 bg-amber-50/70 px-3.5 py-3 text-[13px] text-amber-900">
            <StickyNote className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
            <p>
              <span className="font-semibold">Observação:</span> {order.notes}
            </p>
          </div>
        )}
      </section>

      {order.payment && (
        <section className="px-5 py-4">
          <h3 className="mb-3 text-xs font-semibold tracking-wider text-ink-500 uppercase">Pagamento</h3>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200/70 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-ink-50 text-ink-500">
                <Wallet className="size-4" aria-hidden />
              </span>
              <div>
                <PaymentMethodLabel method={order.payment.method} className="flex items-center gap-1.5 text-sm font-medium text-ink-900" />
                <div className="mt-1">
                  <PaymentStatusBadge status={order.payment.status} />
                  {order.payment.paidAt && (
                    <span className="ml-2 text-xs text-ink-500">às {formatTime(order.payment.paidAt)}</span>
                  )}
                </div>
              </div>
            </div>
            {canEditPayment && (
              <Button
                size="sm"
                variant={order.payment.status === 'PAID' ? 'ghost' : 'soft'}
                loading={paymentLoading}
                leftIcon={order.payment.status === 'PAID' ? undefined : <CircleCheck />}
                onClick={() => onTogglePayment(order.payment?.status === 'PAID' ? 'PENDING' : 'PAID')}
              >
                {order.payment.status === 'PAID' ? 'Marcar como pendente' : 'Registrar pagamento'}
              </Button>
            )}
          </div>
        </section>
      )}

      {order.statusHistory && order.statusHistory.length > 0 && (
        <section className="px-5 py-4">
          <h3 className="mb-3 text-xs font-semibold tracking-wider text-ink-500 uppercase">Histórico</h3>
          <ol className="space-y-3">
            {order.statusHistory.map((entry, index) => {
              const config = ORDER_STATUS[entry.status];
              const Icon = config.icon;
              const last = index === order.statusHistory!.length - 1;
              return (
                <li key={entry.id} className="flex gap-3">
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full',
                      last ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' : 'bg-ink-100 text-ink-500',
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 pt-0.5 text-[13px]">
                    <p className="font-medium text-ink-900">
                      {config.label}{' '}
                      <span className="font-normal text-ink-500 tabular-nums">· {formatDateTime(entry.createdAt)}</span>
                    </p>
                    {entry.changedBy && (
                      <p className="text-xs text-ink-500">
                        por {entry.changedBy.name}{' '}
                        <Badge tone={entry.changedBy.role === 'ADMIN' ? 'brand' : 'neutral'} className="ml-1 px-1.5 py-0 text-[10px]">
                          {entry.changedBy.role === 'ADMIN' ? 'cantina' : 'estudante'}
                        </Badge>
                      </p>
                    )}
                    {entry.note && <p className="mt-1 text-xs text-ink-600 italic">“{entry.note}”</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}

function DrawerSkeleton() {
  return (
    <div className="space-y-6 p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      {[0, 1, 2].map((key) => (
        <div key={key} className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-lg" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}
