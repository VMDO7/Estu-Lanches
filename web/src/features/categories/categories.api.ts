import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/api-error';
import type { Category, DataResponse } from '@/types/api';
import { useInvalidateCatalog } from '../products/products.api';

export const categoryKeys = {
  list: (includeInactive: boolean) => ['categories', { includeInactive }] as const,
};

export const categoriesApi = {
  list: async (includeInactive = false) =>
    (await api.get<DataResponse<Category[]>>('/categories', { query: { includeInactive } })).data,
  create: async (name: string) => (await api.post<DataResponse<Category>>('/categories', { name })).data,
  update: async (id: string, input: { name?: string; isActive?: boolean }) =>
    (await api.patch<DataResponse<Category>>(`/categories/${id}`, input)).data,
  remove: (id: string) => api.delete<void>(`/categories/${id}`),
  reorder: async (ids: string[]) => (await api.put<DataResponse<Category[]>>('/categories/order', { ids })).data,
};

export function useCategories(includeInactive = false) {
  return useQuery({
    queryKey: categoryKeys.list(includeInactive),
    queryFn: () => categoriesApi.list(includeInactive),
    staleTime: 60_000,
  });
}

export function useCategoryMutations() {
  const invalidate = useInvalidateCatalog();
  const onError = (error: unknown) => toast.error(getErrorMessage(error));

  const create = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: async (category) => {
      await invalidate();
      toast.success(`Categoria "${category.name}" criada.`);
    },
    onError,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; isActive?: boolean } }) =>
      categoriesApi.update(id, input),
    onSuccess: () => invalidate(),
    onError,
  });

  const remove = useMutation({
    mutationFn: categoriesApi.remove,
    onSuccess: async () => {
      await invalidate();
      toast.success('Categoria excluída.');
    },
    onError,
  });

  const reorder = useMutation({
    mutationFn: categoriesApi.reorder,
    onSuccess: () => invalidate(),
    onError,
  });

  return { create, update, remove, reorder };
}
