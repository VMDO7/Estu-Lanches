import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/api-error';
import { formatOrderCode } from '@/lib/format';
import type { DataResponse, Order, OrderStatus, Paginated, PaymentMethod } from '@/types/api';
import { menuKeys } from '../menu/menu.api';
import { ORDER_STATUS } from './order-status';

export interface OrderListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  scope?: 'active' | 'history' | 'all';
  period?: 'today' | '7d' | '30d' | 'all';
  search?: string;
  studentId?: string;
  sort?: 'newest' | 'oldest';
}

export interface CreateOrderInput {
  items: Array<{ productId: string; quantity: number }>;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export const orderKeys = {
  all: ['orders'] as const,
  list: (params: OrderListParams) => ['orders', 'list', params] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
};

export const ordersApi = {
  list: (params: OrderListParams) => api.get<Paginated<Order>>('/orders', { query: { ...params } }),
  get: async (id: string) => (await api.get<DataResponse<Order>>(`/orders/${id}`)).data,
  create: async (input: CreateOrderInput, idempotencyKey: string) =>
    (await api.post<DataResponse<Order>>('/orders', input, { headers: { 'Idempotency-Key': idempotencyKey } })).data,
  updateStatus: async (id: string, body: { status: OrderStatus; note?: string; markAsPaid?: boolean }) =>
    (await api.patch<DataResponse<Order>>(`/orders/${id}/status`, body)).data,
  updatePayment: async (id: string, status: 'PENDING' | 'PAID') =>
    (await api.patch<DataResponse<Order>>(`/orders/${id}/payment`, { status })).data,
};

interface QueryOptions<T> {
  /** Intervalo de polling; pode depender dos dados atuais (ex.: só enquanto ativo). */
  refetchInterval?: number | false | ((data: T | undefined) => number | false);
  enabled?: boolean;
}

function resolveInterval<T>(interval: QueryOptions<T>['refetchInterval']) {
  if (typeof interval === 'function') {
    return (query: { state: { data: T | undefined } }) => interval(query.state.data);
  }
  return interval ?? false;
}

export function useOrders(params: OrderListParams, options: QueryOptions<Paginated<Order>> = {}) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => ordersApi.list(params),
    placeholderData: keepPreviousData,
    refetchInterval: resolveInterval(options.refetchInterval),
    enabled: options.enabled ?? true,
  });
}

export function useOrder(id: string | undefined, options: QueryOptions<Order> = {}) {
  return useQuery({
    queryKey: orderKeys.detail(id ?? ''),
    queryFn: () => ordersApi.get(id!),
    enabled: !!id && (options.enabled ?? true),
    refetchInterval: resolveInterval(options.refetchInterval),
  });
}

function useOrderCacheSync() {
  const queryClient = useQueryClient();
  return async (order: Order) => {
    queryClient.setQueryData(orderKeys.detail(order.id), order);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: menuKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['students'] }),
    ]);
  };
}

export function useUpdateOrderStatus() {
  const sync = useOrderCacheSync();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status: OrderStatus; note?: string; markAsPaid?: boolean }) =>
      ordersApi.updateStatus(id, body),
    onSuccess: async (order) => {
      await sync(order);
      toast.success(`Pedido ${formatOrderCode(order.code)}: ${ORDER_STATUS[order.status].label.toLowerCase()}.`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdatePayment() {
  const sync = useOrderCacheSync();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'PENDING' | 'PAID' }) => ordersApi.updatePayment(id, status),
    onSuccess: async (order) => {
      await sync(order);
      toast.success(
        order.payment?.status === 'PAID' ? 'Pagamento registrado como recebido.' : 'Pagamento marcado como pendente.',
      );
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
