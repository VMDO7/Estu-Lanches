import { ChevronRight, ClipboardList, History } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { PageTitle } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { OrderStatusBadge } from '@/features/orders/OrderBadges';
import { OrderProgressBar } from '@/features/orders/OrderProgress';
import { useOrders } from '@/features/orders/orders.api';
import { cn } from '@/lib/cn';
import { formatCurrency, formatDateTime, formatOrderCode } from '@/lib/format';
import type { Order } from '@/types/api';

type Tab = 'active' | 'history';

export function MyOrdersPage() {
  const [tab, setTab] = useState<Tab>('active');
  const [page, setPage] = useState(1);

  const active = useOrders({ scope: 'active', pageSize: 20, sort: 'newest' }, { refetchInterval: 8_000 });
  const history = useOrders({ scope: 'history', page, pageSize: 10, sort: 'newest' }, { enabled: tab === 'history' });
  const query = tab === 'active' ? active : history;

  return (
    <>
      <PageTitle title="Meus pedidos" />
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-ink-950">Meus pedidos</h1>
          <p className="mt-1 text-[15px] text-ink-500">Acompanhe o status e consulte suas compras anteriores.</p>
        </div>
        <SegmentedControl
          label="Tipo de pedido"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'active', label: 'Em andamento', count: active.data?.meta.total },
            { value: 'history', label: 'Histórico' },
          ]}
        />
      </div>

      {query.error ? (
        <Card>
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </Card>
      ) : query.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : query.data && query.data.data.length > 0 ? (
        <div className={cn('space-y-3 transition-opacity', query.isPlaceholderData && 'opacity-60')}>
          {query.data.data.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
          {tab === 'history' && (
            <Pagination
              page={query.data.meta.page}
              totalPages={query.data.meta.totalPages}
              total={query.data.meta.total}
              pageSize={query.data.meta.pageSize}
              onPageChange={setPage}
              noun="pedidos"
            />
          )}
        </div>
      ) : (
        <Card>
          {tab === 'active' ? (
            <EmptyState
              icon={<ClipboardList />}
              title="Nenhum pedido em andamento"
              description="Bateu a fome? Faça um pedido e acompanhe tudo por aqui."
              action={<ButtonLink to="/aluno">Ver cardápio</ButtonLink>}
            />
          ) : (
            <EmptyState icon={<History />} title="Sem pedidos finalizados" description="Seus pedidos entregues ou cancelados aparecem aqui." />
          )}
        </Card>
      )}
    </>
  );
}

function OrderRow({ order }: { order: Order }) {
  const summary = order.items.map((item) => `${item.quantity}× ${item.productName}`).join(', ');
  return (
    <Link
      to={`/aluno/pedidos/${order.id}`}
      className="group block rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card transition hover:shadow-soft sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[15px] font-semibold tracking-tight text-ink-950">{formatOrderCode(order.code)}</span>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-[13px] text-ink-500">{formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight text-ink-950">{formatCurrency(order.total)}</span>
          <ChevronRight className="size-5 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-ink-500" aria-hidden />
        </div>
      </div>
      <p className="mt-3 truncate text-[13px] text-ink-600">{summary}</p>
      {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
        <div className="mt-4">
          <OrderProgressBar order={order} />
        </div>
      )}
    </Link>
  );
}
