import { ClipboardList, List, RefreshCw, SquareKanban } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { PageHeader, PageTitle } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/ui/SearchInput';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/Table';
import { OrderBoard } from '@/features/orders/OrderBoard';
import { OrderStatusBadge, PaymentMethodLabel, PaymentStatusBadge } from '@/features/orders/OrderBadges';
import { OrderDetailDrawer } from '@/features/orders/OrderDetailDrawer';
import { NEXT_ACTION, ORDER_STATUS } from '@/features/orders/order-status';
import { useOrders, useUpdateOrderStatus, type OrderListParams } from '@/features/orders/orders.api';
import { formatCurrency, formatDateTime, formatOrderCode, formatTime } from '@/lib/format';
import { useDebouncedValue, useNow } from '@/lib/hooks';
import type { Order, OrderStatus } from '@/types/api';

type View = 'quadro' | 'lista';

const STATUS_TABS: Array<{ value: '' | OrderStatus; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'RECEIVED', label: ORDER_STATUS.RECEIVED.label },
  { value: 'PREPARING', label: ORDER_STATUS.PREPARING.label },
  { value: 'READY', label: 'Prontos' },
  { value: 'DELIVERED', label: 'Entregues' },
  { value: 'CANCELLED', label: 'Cancelados' },
];

export function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const view: View = params.get('view') === 'lista' ? 'lista' : 'quadro';
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const setView = (next: View) =>
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        if (next === 'lista') updated.set('view', 'lista');
        else updated.delete('view');
        return updated;
      },
      { replace: true },
    );

  return (
    <>
      <PageTitle title="Pedidos" />
      <PageHeader
        title="Pedidos"
        description={view === 'quadro' ? 'Fila em tempo real — os mais antigos primeiro.' : 'Histórico completo com filtros.'}
        actions={
          <SegmentedControl
            label="Modo de visualização"
            value={view}
            onChange={setView}
            options={[
              { value: 'quadro', label: 'Quadro', icon: <SquareKanban /> },
              { value: 'lista', label: 'Lista', icon: <List /> },
            ]}
          />
        }
      />

      {view === 'quadro' ? <BoardView onOpen={setSelectedOrder} /> : <ListView onOpen={setSelectedOrder} />}

      <OrderDetailDrawer orderId={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </>
  );
}

function BoardView({ onOpen }: { onOpen: (id: string) => void }) {
  const now = useNow(15_000);
  const board = useOrders({ scope: 'active', sort: 'oldest', pageSize: 100 }, { refetchInterval: 10_000 });
  const updateStatus = useUpdateOrderStatus();

  const advance = (order: Order) => {
    const next = NEXT_ACTION[order.status];
    if (!next) return;
    updateStatus.mutate({
      id: order.id,
      status: next.status,
      // Entrega pelo quadro registra o pagamento pendente como recebido.
      ...(next.status === 'DELIVERED' && order.payment?.status === 'PENDING' && { markAsPaid: true }),
    });
  };

  if (board.error) {
    return (
      <Card>
        <ErrorState error={board.error} onRetry={() => void board.refetch()} />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-[13px] text-ink-500">
        <span className="inline-flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-brand-500" />
          </span>
          Atualização automática
          {board.dataUpdatedAt > 0 && <span className="tabular-nums">· {formatTime(new Date(board.dataUpdatedAt).toISOString())}</span>}
        </span>
        <Button variant="ghost" size="sm" leftIcon={<RefreshCw className={board.isFetching ? 'animate-spin' : undefined} />} onClick={() => void board.refetch()}>
          Atualizar
        </Button>
      </div>

      {board.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-96 rounded-2xl" />
          ))}
        </div>
      ) : (
        <OrderBoard
          orders={board.data?.data ?? []}
          now={now}
          onOpen={onOpen}
          onAdvance={advance}
          pendingOrderId={updateStatus.isPending ? (updateStatus.variables?.id ?? null) : null}
        />
      )}
    </div>
  );
}

function ListView({ onOpen }: { onOpen: (id: string) => void }) {
  const [status, setStatus] = useState<'' | OrderStatus>('');
  const [period, setPeriod] = useState<NonNullable<OrderListParams['period']>>('7d');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim());

  const list = useOrders(
    { status: status || undefined, period, search: debouncedSearch || undefined, page, pageSize: 15, sort: 'newest' },
    { refetchInterval: 30_000 },
  );

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-ink-100 p-4 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedControl label="Filtrar por status" size="sm" value={status} onChange={resetPage(setStatus)} options={STATUS_TABS} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput
            value={search}
            onChange={resetPage(setSearch)}
            placeholder="Código, estudante ou matrícula"
            className="sm:w-72"
          />
          <Select
            value={period}
            onChange={(event) => resetPage(setPeriod)(event.target.value as typeof period)}
            aria-label="Período"
            className="sm:w-40"
          >
            <option value="today">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="all">Todo o período</option>
          </Select>
        </div>
      </div>

      {list.error ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.isLoading ? (
        <div className="space-y-3 p-5">
          {[0, 1, 2, 3, 4].map((key) => (
            <Skeleton key={key} className="h-12" />
          ))}
        </div>
      ) : list.data && list.data.data.length > 0 ? (
        <div className={list.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <Table>
            <THead>
              <TR>
                <TH>Pedido</TH>
                <TH>Estudante</TH>
                <TH className="hidden lg:table-cell">Itens</TH>
                <TH>Total</TH>
                <TH className="hidden md:table-cell">Pagamento</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {list.data.data.map((order) => (
                <TR key={order.id} className="cursor-pointer hover:bg-ink-25" onClick={() => onOpen(order.id)}>
                  <TD>
                    <button
                      type="button"
                      className="font-mono font-semibold text-ink-950 hover:text-brand-700"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(order.id);
                      }}
                    >
                      {formatOrderCode(order.code)}
                    </button>
                    <p className="text-xs text-ink-500">{formatDateTime(order.createdAt)}</p>
                  </TD>
                  <TD>
                    <p className="font-medium text-ink-900">{order.student.name}</p>
                    <p className="text-xs text-ink-500">
                      {order.student.registration} · {order.student.grade}
                    </p>
                  </TD>
                  <TD className="hidden max-w-xs lg:table-cell">
                    <p className="truncate text-[13px] text-ink-600">
                      {order.items.map((item) => `${item.quantity}× ${item.productName}`).join(', ')}
                    </p>
                  </TD>
                  <TD className="font-semibold text-ink-900 tabular-nums">{formatCurrency(order.total)}</TD>
                  <TD className="hidden md:table-cell">
                    {order.payment && (
                      <div className="space-y-1">
                        <PaymentMethodLabel method={order.payment.method} />
                        <div>
                          <PaymentStatusBadge status={order.payment.status} />
                        </div>
                      </div>
                    )}
                  </TD>
                  <TD>
                    <OrderStatusBadge status={order.status} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <div className="border-t border-ink-100">
            <Pagination
              page={list.data.meta.page}
              totalPages={list.data.meta.totalPages}
              total={list.data.meta.total}
              pageSize={list.data.meta.pageSize}
              onPageChange={setPage}
              noun="pedidos"
            />
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<ClipboardList />}
          title="Nenhum pedido encontrado"
          description="Ajuste os filtros ou o período para ver outros pedidos."
        />
      )}
    </Card>
  );
}
