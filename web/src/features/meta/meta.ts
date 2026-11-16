import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { AppMeta, DataResponse } from '@/types/api';

export function useAppMeta() {
  return useQuery({
    queryKey: ['meta'],
    queryFn: async () => (await api.get<DataResponse<AppMeta>>('/meta', { auth: false })).data,
    staleTime: Infinity,
    retry: 1,
  });
}
