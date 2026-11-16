import {
  ArrowRight,
  CalendarDays,
  ChartColumn,
  CircleDollarSign,
  Clock,
  Layers,
  Package,
  Receipt,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { PageHeader, PageTitle } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/Table';
import { useAuth } from '@/features/auth/useAuth';
import { ChartCard } from '@/features/dashboard/ChartCard';
import { PeakHoursChart, RevenueChart, WeeklySalesChart, describePeak, fillHours } from '@/features/dashboard/charts';
import {
  useDashboardSummary,
  useSalesByHour,
  useSalesSeries,
  useTopProducts,
  type PeriodDays,
} from '@/features/dashboard/dashboard.api';
import { StatTile } from '@/features/dashboard/StatTile';
import { TopProductsList } from '@/features/dashboard/TopProductsList';
import { OrderStatusBadge } from '@/features/orders/OrderBadges';
import { OrderDetailDrawer } from '@/features/orders/OrderDetailDrawer';
import { useOrders } from '@/features/orders/orders.api';
import { ProductImage } from '@/features/products/ProductImage';
import { cn } from '@/lib/cn';
import { firstName, formatCurrency, formatDayKey, formatNumber, formatOrderCode, formatRelative, greeting, pluralize } from '@/lib/format';
import { useNow } from '@/lib/hooks';

const PERIOD_OPTIONS: Array<{ value: `${PeriodDays}`; label: string }> = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
];

export function DashboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<PeriodDays>(30);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const summary = useDashboardSummary();
  const week = useSalesSeries(7);
  const sales = useSalesSeries(period);
  const top = useTopProducts(period);
  const hours = useSalesByHour(period);
  const recent = useOrders({ pageSize: 6, sort: 'newest' }, { refetchInterval: 30_000 });
  const now = useNow(30_000);

  const s = summary.data;
  const todayRaw = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayLabel = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);

  const periodTotals = useMemo(() => {
    const points = sales.data ?? [];
    const revenue = points.reduce((sum, point) => sum + point.revenue, 0);
    const orders = points.reduce((sum, point) => sum + point.orders, 0);
    const best = points.reduce<(typeof points)[number] | null>((acc, point) => (!acc || point.revenue > acc.revenue ? point : acc), null);
    return { revenue, orders, averageTicket: orders > 0 ? revenue / orders : 0, best };
  }, [sales.data]);

  const hourData = useMemo(() => fillHours(hours.data ?? []), [hours.data]);

  return (
    <>
      <PageTitle title="Visão geral" />
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500">
            <CalendarDays className="size-4" aria-hidden />
            {todayLabel}
          </span>
        }
        title={`${greeting()}, ${user ? firstName(user.name) : ''}`}
        description="Acompanhe a operação da cantina em tempo real."
        actions={
          <ButtonLink to="/admin/pedidos" rightIcon={<ArrowRight />}>
            Abrir quadro de pedidos
          </ButtonLink>
        }
      />

      {summary.error ? (
        <Card className="mb-6">
          <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
        </Card>
      ) : (
        <section aria-label="Indicadores de hoje" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Faturamento hoje"
            icon={<CircleDollarSign />}
            loading={summary.isLoading}
            value={s ? formatCurrency(s.today.revenue) : '—'}
            delta={
              s && {
                current: s.today.revenue,
                previous: s.yesterday.revenue,
                comparison: 'vs. ontem até agora',
                emptyLabel: 'Sem vendas ontem até este horário',
              }
            }
            trend={week.data?.map((point) => point.revenue)}
          />
          <StatTile
            label="Pedidos hoje"
            icon={<Receipt />}
            loading={summary.isLoading}
            value={s ? formatNumber(s.today.orders) : '—'}
            delta={
              s && {
                current: s.today.orders,
                previous: s.yesterday.orders,
                comparison: 'vs. ontem até agora',
                emptyLabel: 'Sem pedidos ontem até este horário',
              }
            }
            footer={s && <span>Ticket médio {formatCurrency(s.today.averageTicket)}</span>}
          />
          <StatTile
            label="Pedidos pendentes"
            icon={<Clock />}
            loading={summary.isLoading}
            value={s ? formatNumber(s.pendingOrders.total) : '—'}
            footer={
              s && (
                <span className="flex flex-wrap gap-x-2.5 gap-y-1">
                  <span><strong className="font-semibold text-ink-700">{s.pendingOrders.byStatus.RECEIVED}</strong> recebidos</span>
                  <span><strong className="font-semibold text-ink-700">{s.pendingOrders.byStatus.PREPARING}</strong> em preparo</span>
                  <span><strong className="font-semibold text-ink-700">{s.pendingOrders.byStatus.READY}</strong> prontos</span>
                </span>
              )
            }
          />
          <StatTile
            label="Produtos cadastrados"
            icon={<Package />}
            loading={summary.isLoading}
            value={s ? formatNumber(s.products.total) : '—'}
            footer={
              s && (
                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span><strong className="font-semibold text-ink-700">{s.products.available}</strong> à venda</span>
                  {s.products.lowStock + s.products.outOfStock > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-700">
                      <TriangleAlert className="size-3.5" aria-hidden />
                      {s.products.lowStock + s.products.outOfStock} precisam de reposição
                    </span>
                  )}
                </span>
              )
            }
          />
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Vendas da semana"
          description="Pedidos por dia nos últimos 7 dias · hoje em destaque"
          icon={<ChartColumn />}
          loading={week.isLoading}
          error={week.error}
          onRetry={() => void week.refetch()}
          table={
            week.data && {
              caption: 'Pedidos e faturamento por dia nos últimos 7 dias',
              columns: ['Dia', 'Pedidos', 'Faturamento'],
              rows: week.data.map((point) => [
                formatDayKey(point.date, { weekday: 'short', day: '2-digit', month: '2-digit' }),
                point.orders,
                formatCurrency(point.revenue),
              ]),
            }
          }
        >
          {week.data && <WeeklySalesChart data={week.data} />}
        </ChartCard>

        <LowStockCard summary={s} loading={summary.isLoading} />
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Últimos pedidos"
          description="Atualizado automaticamente"
          icon={<Receipt />}
          actions={
            <Link to="/admin/pedidos?view=lista" className="text-[13px] font-medium text-brand-700 hover:text-brand-800">
              Ver todos
            </Link>
          }
        />
        <div className="mt-4">
          {recent.isLoading ? (
            <div className="space-y-3 px-5 pb-5">
              {[0, 1, 2].map((key) => (
                <Skeleton key={key} className="h-10" />
              ))}
            </div>
          ) : recent.data && recent.data.data.length > 0 ? (
            <Table>
              <THead>
                <TR>
                  <TH>Pedido</TH>
                  <TH>Estudante</TH>
                  <TH className="hidden md:table-cell">Itens</TH>
                  <TH>Total</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {recent.data.data.map((order) => (
                  <TR key={order.id} className="cursor-pointer hover:bg-ink-25" onClick={() => setSelectedOrder(order.id)}>
                    <TD>
                      <button
                        type="button"
                        className="font-mono font-semibold text-ink-950 hover:text-brand-700"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedOrder(order.id);
                        }}
                      >
                        {formatOrderCode(order.code)}
                      </button>
                      <p className="text-xs text-ink-500">{formatRelative(order.createdAt, now)}</p>
                    </TD>
                    <TD>
                      <p className="font-medium text-ink-900">{order.student.name}</p>
                      <p className="text-xs text-ink-500">{order.student.grade}</p>
                    </TD>
                    <TD className="hidden max-w-xs md:table-cell">
                      <p className="truncate text-[13px] text-ink-600">
                        {order.items.map((item) => `${item.quantity}× ${item.productName}`).join(', ')}
                      </p>
                    </TD>
                    <TD className="font-semibold text-ink-900 tabular-nums">{formatCurrency(order.total)}</TD>
                    <TD>
                      <OrderStatusBadge status={order.status} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <EmptyState compact icon={<Receipt />} title="Nenhum pedido ainda" description="Os pedidos dos estudantes aparecem aqui assim que forem feitos." />
          )}
        </div>
      </Card>

      {/* Filtro único acima dos gráficos que ele afeta */}
      <section aria-labelledby="performance-title" className="mt-10">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="performance-title" className="text-lg font-semibold tracking-tight text-ink-950">
              Desempenho por período
            </h2>
            <p className="text-[13px] text-ink-500">Pedidos cancelados não entram nos cálculos.</p>
          </div>
          <SegmentedControl
            label="Período de análise"
            value={`${period}` as `${PeriodDays}`}
            onChange={(value) => setPeriod(Number(value) as PeriodDays)}
            options={PERIOD_OPTIONS}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <ChartCard
            className="lg:col-span-2"
            title="Faturamento por período"
            description={
              sales.data
                ? `${formatCurrency(periodTotals.revenue)} em ${pluralize(periodTotals.orders, 'pedido', 'pedidos')}`
                : 'Faturamento diário'
            }
            icon={<TrendingUp />}
            loading={sales.isLoading}
            fetching={sales.isPlaceholderData}
            error={sales.error}
            onRetry={() => void sales.refetch()}
            table={
              sales.data && {
                caption: `Faturamento diário nos últimos ${period} dias`,
                columns: ['Dia', 'Faturamento', 'Pedidos'],
                rows: sales.data.map((point) => [
                  formatDayKey(point.date, { day: '2-digit', month: '2-digit' }),
                  formatCurrency(point.revenue),
                  point.orders,
                ]),
              }
            }
          >
            {sales.data && <RevenueChart data={sales.data} />}
          </ChartCard>

          <Card className={cn('flex flex-col transition-opacity', top.isPlaceholderData && 'opacity-50')}>
            <CardHeader title="Mais vendidos" description={`Top 5 em unidades · ${period} dias`} icon={<Layers />} />
            <div className="flex-1 px-5 pt-5 pb-5">
              {top.isLoading ? (
                <div className="space-y-4">
                  {[0, 1, 2, 3, 4].map((key) => (
                    <Skeleton key={key} className="h-9" />
                  ))}
                </div>
              ) : top.error ? (
                <ErrorState error={top.error} onRetry={() => void top.refetch()} className="py-6" />
              ) : top.data && top.data.length > 0 ? (
                <TopProductsList products={top.data} />
              ) : (
                <EmptyState compact icon={<Layers />} title="Sem vendas no período" />
              )}
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Horários de pico"
            description={describePeak(hourData) ?? 'Pedidos por hora do dia'}
            icon={<Clock />}
            loading={hours.isLoading}
            fetching={hours.isPlaceholderData}
            error={hours.error}
            onRetry={() => void hours.refetch()}
            height={220}
            table={{
              caption: 'Pedidos por hora do dia',
              columns: ['Horário', 'Pedidos', 'Faturamento'],
              rows: hourData.map((point) => [`${point.hour}h–${point.hour + 1}h`, point.orders, formatCurrency(point.revenue)]),
            }}
          >
            {hourData.length > 0 ? (
              <PeakHoursChart data={hourData} />
            ) : (
              <EmptyState compact icon={<Clock />} title="Sem pedidos no período" />
            )}
          </ChartCard>

          <Card className={cn('transition-opacity', sales.isPlaceholderData && 'opacity-50')}>
            <CardHeader title="Resumo do período" description={`Últimos ${period} dias`} icon={<CalendarDays />} />
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-b-2xl bg-ink-100 mt-5">
              {[
                { label: 'Faturamento', value: formatCurrency(periodTotals.revenue) },
                { label: 'Pedidos', value: formatNumber(periodTotals.orders) },
                { label: 'Ticket médio', value: formatCurrency(periodTotals.averageTicket) },
                {
                  label: 'Melhor dia',
                  value: periodTotals.best && periodTotals.best.revenue > 0
                    ? formatDayKey(periodTotals.best.date, { day: '2-digit', month: 'short' })
                    : '—',
                  hint: periodTotals.best && periodTotals.best.revenue > 0 ? formatCurrency(periodTotals.best.revenue) : undefined,
                },
              ].map((item) => (
                <div key={item.label} className="bg-white px-5 py-5">
                  <dt className="text-[13px] text-ink-500">{item.label}</dt>
                  <dd className="mt-1.5 text-xl font-semibold tracking-tight text-ink-950">
                    {sales.isLoading ? <Skeleton className="h-7 w-24" /> : item.value}
                  </dd>
                  {'hint' in item && item.hint && <p className="mt-0.5 text-xs text-ink-500">{item.hint}</p>}
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </section>

      <OrderDetailDrawer orderId={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </>
  );
}

function LowStockCard({ summary, loading }: { summary: ReturnType<typeof useDashboardSummary>['data']; loading: boolean }) {
  const products = summary?.lowStockProducts ?? [];

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Estoque baixo"
        description={summary ? `Itens com ${summary.lowStockThreshold} unidades ou menos` : undefined}
        icon={<TriangleAlert />}
        actions={
          <Link to="/admin/produtos?disponibilidade=low_stock" className="text-[13px] font-medium text-brand-700 hover:text-brand-800">
            Repor
          </Link>
        }
      />
      <div className="flex-1 px-5 pt-4 pb-5">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-11" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState compact icon={<Package />} title="Estoque em dia" description="Nenhum produto precisa de reposição agora." />
        ) : (
          <ul className="space-y-3">
            {products.map((product) => (
              <li key={product.id} className="flex items-center gap-3">
                <div className="size-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-ink-200/70">
                  <ProductImage src={product.imageUrl} name={product.name} categorySlug={product.category.slug} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink-900">{product.name}</p>
                  <p className="text-xs text-ink-500">{product.category.name}</p>
                </div>
                <Badge tone={product.stock === 0 ? 'danger' : 'warning'} dot>
                  {product.stock === 0 ? 'Esgotado' : `${product.stock} un.`}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
