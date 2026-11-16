import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { DashboardSummary, DataResponse, HourPoint, SalesPoint, TopProduct } from '@/types/api';

export type PeriodDays = 7 | 30 | 90;

export const dashboardApi = {
  summary: async () => (await api.get<DataResponse<DashboardSummary>>('/dashboard/summary')).data,
  sales: async (days: PeriodDays) =>
    (await api.get<DataResponse<SalesPoint[]>>('/dashboard/sales', { query: { days } })).data,
  topProducts: async (days: PeriodDays, limit = 5) =>
    (await api.get<DataResponse<TopProduct[]>>('/dashboard/top-products', { query: { days, limit } })).data,
  salesByHour: async (days: PeriodDays) =>
    (await api.get<DataResponse<HourPoint[]>>('/dashboard/sales-by-hour', { query: { days } })).data,
};

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: dashboardApi.summary,
    refetchInterval: 30_000,
  });
}

export function useSalesSeries(days: PeriodDays) {
  return useQuery({
    queryKey: ['dashboard', 'sales', days],
    queryFn: () => dashboardApi.sales(days),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

export function useTopProducts(days: PeriodDays) {
  return useQuery({
    queryKey: ['dashboard', 'top-products', days],
    queryFn: () => dashboardApi.topProducts(days),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

export function useSalesByHour(days: PeriodDays) {
  return useQuery({
    queryKey: ['dashboard', 'sales-by-hour', days],
    queryFn: () => dashboardApi.salesByHour(days),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}
