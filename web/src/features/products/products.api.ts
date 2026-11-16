import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/api-error';
import type { DataResponse, Paginated, Product } from '@/types/api';
import { menuKeys } from '../menu/menu.api';

export interface ProductListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  availability?: 'available' | 'unavailable' | 'out_of_stock' | 'low_stock';
  sort?: 'name' | 'price' | 'stock' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  stock: number;
  isAvailable: boolean;
  imageKey: string | null;
}

export const productKeys = {
  all: ['products'] as const,
  list: (params: ProductListParams) => ['products', 'list', params] as const,
  catalog: ['products', 'catalog'] as const,
};

export const productsApi = {
  list: (params: ProductListParams) =>
    api.get<Paginated<Product>>('/products', { query: { ...params } }),
  create: async (input: ProductInput) => (await api.post<DataResponse<Product>>('/products', input)).data,
  update: async (id: string, input: Partial<ProductInput>) =>
    (await api.patch<DataResponse<Product>>(`/products/${id}`, input)).data,
  remove: async (id: string) => (await api.delete<DataResponse<{ archived: boolean }>>(`/products/${id}`)).data,
  adjustStock: async (id: string, delta: number) =>
    (await api.post<DataResponse<Product>>(`/products/${id}/stock-adjustments`, { delta })).data,
  uploadImage: async (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return (await api.upload<DataResponse<{ key: string; url: string }>>('/uploads/images', form)).data;
  },
  /** Catálogo completo (percorre as páginas) — usado na gestão do cardápio. */
  async listAll() {
    const items: Product[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const result = await productsApi.list({ page, pageSize: 100, sort: 'name', order: 'asc' });
      items.push(...result.data);
      totalPages = result.meta.totalPages;
      page++;
    } while (page <= totalPages);
    return items;
  },
};

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCatalog() {
  return useQuery({ queryKey: productKeys.catalog, queryFn: () => productsApi.listAll() });
}

/** Invalida tudo que depende do catálogo (admin, cardápio do aluno e dashboard). */
export function useInvalidateCatalog() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: productKeys.all }),
      queryClient.invalidateQueries({ queryKey: menuKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
}

export function useUpdateProduct() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProductInput> }) => productsApi.update(id, input),
    onSuccess: () => invalidate(),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useAdjustStock() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: number }) => productsApi.adjustStock(id, delta),
    onSuccess: () => invalidate(),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
