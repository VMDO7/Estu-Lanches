import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import type { Order } from '@/types/api';
import { ORDER_FLOW, ORDER_STATUS } from './order-status';

/** Barra compacta de progresso (lista de pedidos do estudante). */
export function OrderProgressBar({ order }: { order: Order }) {
  if (order.status === 'CANCELLED') return null;
  const index = ORDER_FLOW.indexOf(order.status);
  return (
    <div className="flex gap-1.5" aria-label={`Etapa ${index + 1} de ${ORDER_FLOW.length}: ${ORDER_STATUS[order.status].label}`}>
      {ORDER_FLOW.map((status, i) => (
        <span
          key={status}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-colors duration-500',
            i < index ? 'bg-brand-500' : i === index ? 'bg-brand-500' : 'bg-ink-200',
            i === index && order.status !== 'DELIVERED' && 'animate-pulse',
          )}
        />
      ))}
    </div>
  );
}

/** Linha do tempo detalhada, com horários reais do histórico de status. */
export function OrderTracker({ order }: { order: Order }) {
  const history = order.statusHistory ?? [];
  const reachedAt = (status: string) => history.find((entry) => entry.status === status)?.createdAt;

  if (order.status === 'CANCELLED') {
    const cancelled = history.find((entry) => entry.status === 'CANCELLED');
    return (
      <div className="rounded-xl border border-red-100 bg-red-50/60 p-4">
        <p className="text-sm font-semibold text-red-800">Pedido cancelado</p>
        <p className="mt-0.5 text-[13px] text-red-700/80">
          {cancelled
            ? `Cancelado às ${formatTime(cancelled.createdAt)}${cancelled.changedBy?.role === 'ADMIN' ? ' pela cantina' : ''}.`
            : 'Este pedido foi cancelado.'}
          {cancelled?.note && ` Motivo: ${cancelled.note}`}
        </p>
      </div>
    );
  }

  const currentIndex = ORDER_FLOW.indexOf(order.status);

  return (
    <ol className="relative space-y-0">
      {ORDER_FLOW.map((status, index) => {
        const config = ORDER_STATUS[status];
        const Icon = config.icon;
        const done = index < currentIndex || order.status === 'DELIVERED';
        const current = index === currentIndex && order.status !== 'DELIVERED';
        const at = reachedAt(status);
        const isLast = index === ORDER_FLOW.length - 1;

        return (
          <li key={status} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && (
              <span
                className={cn(
                  'absolute top-9 left-[17px] h-[calc(100%-2.25rem)] w-0.5 rounded-full',
                  index < currentIndex ? 'bg-brand-500' : 'bg-ink-200',
                )}
                aria-hidden
              />
            )}
            <span
              className={cn(
                'relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full ring-4 ring-white transition-colors',
                done && 'bg-brand-600 text-white',
                current && 'bg-brand-50 text-brand-700 ring-brand-100',
                !done && !current && 'bg-ink-100 text-ink-400',
              )}
            >
              {current && <span className="absolute inset-0 animate-ping rounded-full bg-brand-400/30" aria-hidden />}
              {done ? <Check className="size-4" strokeWidth={2.5} /> : <Icon className="size-4" />}
            </span>
            <div className="min-w-0 pt-1.5">
              <p className={cn('text-sm font-semibold', done || current ? 'text-ink-900' : 'text-ink-400')}>
                {config.label}
                {at && <span className="ml-2 text-xs font-normal text-ink-500 tabular-nums">{formatTime(at)}</span>}
              </p>
              {current && <p className="mt-0.5 text-[13px] text-ink-500">{config.description}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
