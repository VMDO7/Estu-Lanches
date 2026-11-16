import { ArrowLeft, Ban, CalendarDays, CircleDollarSign, Clock, GraduationCap, Hash, Heart, Mail, Receipt, ShoppingBag, UserCheck, UserX } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { PageTitle } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/Table';
import { StatTile } from '@/features/dashboard/StatTile';
import { OrderStatusBadge } from '@/features/orders/OrderBadges';
import { OrderDetailDrawer } from '@/features/orders/OrderDetailDrawer';
import { useOrders } from '@/features/orders/orders.api';
import { useSetStudentActive, useStudent } from '@/features/students/students.api';
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatOrderCode, formatRelative } from '@/lib/format';

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const student = useStudent(id);
  const [page, setPage] = useState(1);
  const orders = useOrders({ studentId: id, page, pageSize: 8, sort: 'newest' }, { enabled: !!id });
  const setActive = useSetStudentActive();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const data = student.data;

  return (
    <>
      <PageTitle title={data?.name ?? 'Estudante'} />
      <Link to="/admin/estudantes" className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="size-4" aria-hidden />
        Estudantes
      </Link>

      {student.error ? (
        <Card>
          <ErrorState error={student.error} onRetry={() => void student.refetch()} />
        </Card>
      ) : student.isLoading || !data ? (
        <div className="space-y-6">
          <Skeleton className="h-24 rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar name={data.name} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-ink-950">{data.name}</h1>
                  {data.isActive ? <Badge tone="success" dot>Conta ativa</Badge> : <Badge tone="danger" dot>Conta desativada</Badge>}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="size-3.5" aria-hidden /> {data.email}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Hash className="size-3.5" aria-hidden /> {data.registration}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="size-3.5" aria-hidden /> {data.grade}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant={data.isActive ? 'danger-soft' : 'soft'}
              leftIcon={data.isActive ? <UserX /> : <UserCheck />}
              onClick={() => (data.isActive ? setConfirmOpen(true) : setActive.mutate({ id: data.id, isActive: true }))}
              loading={setActive.isPending}
            >
              {data.isActive ? 'Desativar acesso' : 'Reativar acesso'}
            </Button>
          </div>

          <section aria-label="Resumo de compras" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Pedidos realizados" icon={<ShoppingBag />} value={formatNumber(data.ordersCount)} footer="Exceto cancelados" />
            <StatTile label="Total gasto" icon={<CircleDollarSign />} value={formatCurrency(data.totalSpent)} />
            <StatTile label="Ticket médio" icon={<Receipt />} value={formatCurrency(data.averageTicket)} />
            <StatTile label="Cancelados" icon={<Ban />} value={formatNumber(data.cancelledCount)} />
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="space-y-6">
              <Card>
                <CardHeader title="Informações" icon={<CalendarDays />} />
                <dl className="space-y-3.5 px-5 pt-4 pb-5 text-sm">
                  {[
                    { label: 'Cadastro em', value: formatDate(data.createdAt) },
                    { label: 'Último acesso', value: data.lastLoginAt ? formatRelative(data.lastLoginAt) : 'Nunca acessou' },
                    { label: 'Último pedido', value: data.lastOrderAt ? formatDateTime(data.lastOrderAt) : 'Nenhum pedido' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-4">
                      <dt className="text-ink-500">{item.label}</dt>
                      <dd className="font-medium text-ink-900">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
              <Card>
                <CardHeader title="Favoritos" description="Mais pedidos pelo estudante" icon={<Heart />} />
                <div className="px-5 pt-4 pb-5">
                  {data.favoriteProducts.length === 0 ? (
                    <p className="text-sm text-ink-500">Ainda sem histórico de compras.</p>
                  ) : (
                    <ol className="space-y-2.5">
                      {data.favoriteProducts.map((product, index) => (
                        <li key={product.productId} className="flex items-center gap-3 text-sm">
                          <span className="flex size-6 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                            {index + 1}
                          </span>
                          <span className="flex-1 truncate text-ink-800">{product.name}</span>
                          <span className="text-ink-500 tabular-nums">{product.quantity}×</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </Card>
            </div>

            <Card className="lg:col-span-2">
              <CardHeader title="Histórico de pedidos" icon={<Clock />} />
              <div className="mt-4">
                {orders.error ? (
                  <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
                ) : orders.isLoading ? (
                  <div className="space-y-3 px-5 pb-5">
                    {[0, 1, 2].map((key) => (
                      <Skeleton key={key} className="h-11" />
                    ))}
                  </div>
                ) : orders.data && orders.data.data.length > 0 ? (
                  <>
                    <Table>
                      <THead>
                        <TR>
                          <TH>Pedido</TH>
                          <TH className="hidden sm:table-cell">Itens</TH>
                          <TH>Total</TH>
                          <TH>Status</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {orders.data.data.map((order) => (
                          <TR key={order.id} className="cursor-pointer hover:bg-ink-25" onClick={() => setSelectedOrder(order.id)}>
                            <TD>
                              <span className="font-mono font-semibold text-ink-950">{formatOrderCode(order.code)}</span>
                              <p className="text-xs text-ink-500">{formatDateTime(order.createdAt)}</p>
                            </TD>
                            <TD className="hidden max-w-xs sm:table-cell">
                              <p className="truncate text-[13px] text-ink-600">
                                {order.items.map((item) => `${item.quantity}× ${item.productName}`).join(', ')}
                              </p>
                            </TD>
                            <TD className="font-semibold tabular-nums">{formatCurrency(order.total)}</TD>
                            <TD>
                              <OrderStatusBadge status={order.status} />
                            </TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                    <div className="border-t border-ink-100">
                      <Pagination
                        page={orders.data.meta.page}
                        totalPages={orders.data.meta.totalPages}
                        total={orders.data.meta.total}
                        pageSize={orders.data.meta.pageSize}
                        onPageChange={setPage}
                        noun="pedidos"
                      />
                    </div>
                  </>
                ) : (
                  <EmptyState compact icon={<ShoppingBag />} title="Nenhum pedido ainda" />
                )}
              </div>
            </Card>
          </div>

          <ConfirmDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={() => setActive.mutate({ id: data.id, isActive: false }, { onSuccess: () => setConfirmOpen(false) })}
            loading={setActive.isPending}
            title={`Desativar o acesso de ${data.name}?`}
            description="O estudante não conseguirá entrar nem fazer pedidos, e todas as sessões abertas serão encerradas. O histórico é preservado e você pode reativar a qualquer momento."
            confirmLabel="Desativar acesso"
          />
        </>
      )}

      <OrderDetailDrawer orderId={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </>
  );
}
