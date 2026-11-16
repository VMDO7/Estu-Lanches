import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { DataResponse, MenuCategory } from '@/types/api';

export const menuKeys = { all: ['menu'] as const };

/** Cardápio publicado. Atualiza periodicamente para refletir estoque e mudanças da cantina. */
export function useMenu() {
  return useQuery({
    queryKey: menuKeys.all,
    queryFn: async () => (await api.get<DataResponse<MenuCategory[]>>('/menu')).data,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}
