import { ArrowLeft, Copy, StickyNote } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { PageTitle } from '@/components/ui/PageHeader';
import { OrderStatusBadge, PaymentMethodLabel, PaymentStatusBadge } from '@/features/orders/OrderBadges';
import { OrderTracker } from '@/features/orders/OrderProgress';
import { ORDER_STATUS, isActiveStatus } from '@/features/orders/order-status';
import { useOrder, useUpdateOrderStatus } from '@/features/orders/orders.api';
import { ProductImage } from '@/features/products/ProductImage';
import { cn } from '@/lib/cn';
import { formatCurrency, formatOrderCode, formatWhen } from '@/lib/format';
import type { OrderStatus } from '@/types/api';

export function StudentOrderPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const justPlaced = params.get('novo') === '1';
  const order = useOrder(id, {
    // Atualização ao vivo apenas enquanto o pedido está em andamento.
    refetchInterval: (data) => (data && isActiveStatus(data.status) ? 8_000 : false),
  });
  const cancel = useUpdateOrderStatus();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const previousStatus = useRef<OrderStatus | null>(null);

  // Avisa quando o status muda enquanto o estudante está na tela.
  const status = order.data?.status;
  useEffect(() => {
    if (!status) return;
    if (previousStatus.current && previousStatus.current !== status) {
      const config = ORDER_STATUS[status];
      if (status === 'READY') {
        toast.success('Seu pedido está pronto! Pode buscar no balcão.', { duration: 8000 });
        navigator.vibrate?.([120, 60, 120]);
      } else {
        toast.info(`Pedido atualizado: ${config.label}.`);
      }
    }
    previousStatus.current = status;
  }, [status]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Código copiado.');
    } catch {
      toast.error('Não foi possível copiar o código.');
    }
  };

  if (order.error) {
    return (
      <Card>
        <ErrorState error={order.error} onRetry={() => void order.refetch()} title="Pedido não encontrado" />
      </Card>
    );
  }

  if (order.isLoading || !order.data) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const data = order.data;

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={`Pedido ${formatOrderCode(data.code)}`} />
      <Link to="/aluno/pedidos" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="size-4" aria-hidden />
        Meus pedidos
      </Link>

      {justPlaced && data.status === 'RECEIVED' && <SuccessBanner />}

      <Card className="overflow-hidden">
        <div
          className={cn(
            'relative px-6 py-6 text-center',
            data.status === 'READY' ? 'bg-linear-to-br from-brand-600 to-brand-800 text-white' : 'bg-ink-950 text-white',
          )}
        >
          <div className="bg-dots absolute inset-0 opacity-60" aria-hidden />
          <div className="relative">
            <p className="text-xs font-medium tracking-wider text-white/60 uppercase">Código do pedido</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="font-mono text-4xl font-semibold tracking-[0.12em]">{data.code}</span>
              <button
                type="button"
                onClick={() => void copyCode(data.code)}
                className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Copiar código do pedido"
              >
                <Copy className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-white/70">
              {data.status === 'READY' ? 'Apresente este código no balcão para retirar.' : `Pedido feito ${formatWhen(data.createdAt)}`}
            </p>
          </div>
        </div>

        <div className="border-b border-ink-100 px-6 py-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-ink-950">Acompanhamento</h2>
            <OrderStatusBadge status={data.status} />
          </div>
          <OrderTracker order={data} />
        </div>

        <div className="px-6 py-5">
          <h2 className="mb-3 text-[15px] font-semibold text-ink-950">Itens</h2>
          <ul className="space-y-3">
            {data.items.map((item) => (
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

          {data.notes && (
            <p className="mt-4 flex gap-2 rounded-xl bg-amber-50 px-3.5 py-3 text-[13px] text-amber-900">
              <StickyNote className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
              {data.notes}
            </p>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4">
            <span className="text-sm text-ink-600">Total</span>
            <span className="text-2xl font-semibold tracking-tight text-ink-950">{formatCurrency(data.total)}</span>
          </div>

          {data.payment && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink-50 px-4 py-3">
              <PaymentMethodLabel method={data.payment.method} className="text-sm font-medium text-ink-900" />
              <PaymentStatusBadge status={data.payment.status} />
            </div>
          )}
        </div>

        {data.status === 'RECEIVED' && (
          <div className="border-t border-ink-100 bg-ink-25 px-6 py-4">
            <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirmOpen(true)}>
              Cancelar pedido
            </Button>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() =>
          cancel.mutate({ id: data.id, status: 'CANCELLED' }, { onSuccess: () => setConfirmOpen(false) })
        }
        loading={cancel.isPending}
        title="Cancelar este pedido?"
        description="A cantina ainda não começou o preparo. Ao cancelar, os itens voltam para o cardápio."
        confirmLabel="Sim, cancelar"
        cancelLabel="Manter pedido"
      />
    </div>
  );
}

function SuccessBanner() {
  return (
    <div role="status" className="mb-5 flex animate-scale-in items-center gap-4 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4">
      <svg viewBox="0 0 52 52" className="size-11 shrink-0" aria-hidden>
        <circle cx="26" cy="26" r="25" fill="var(--color-brand-600)" />
        <path
          d="M15 27l7 7 15-16"
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="48"
          className="animate-check"
        />
      </svg>
      <div>
        <p className="text-[15px] font-semibold text-brand-900">Pedido confirmado!</p>
        <p className="text-[13px] text-brand-800/80">A cantina já recebeu. Você será avisado aqui quando estiver pronto.</p>
      </div>
    </div>
  );
}
