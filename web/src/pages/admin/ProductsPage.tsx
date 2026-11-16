import { useMutation } from '@tanstack/react-query';
import { Minus, Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useEffectEvent, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { PageHeader, PageTitle } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/Table';
import { useCategories } from '@/features/categories/categories.api';
import { ProductFormDialog } from '@/features/products/ProductFormDialog';
import { ProductImage } from '@/features/products/ProductImage';
import {
  productsApi,
  useAdjustStock,
  useInvalidateCatalog,
  useProducts,
  useUpdateProduct,
  type ProductListParams,
} from '@/features/products/products.api';
import { LOW_STOCK_THRESHOLD, StockBadge } from '@/features/products/StockBadge';
import { getErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { useDebouncedValue } from '@/lib/hooks';
import type { Product } from '@/types/api';

const AVAILABILITY_VALUES = ['available', 'unavailable', 'out_of_stock', 'low_stock'] as const;
const SORT_OPTIONS = {
  'name-asc': { sort: 'name', order: 'asc', label: 'Nome (A–Z)' },
  'price-asc': { sort: 'price', order: 'asc', label: 'Menor preço' },
  'price-desc': { sort: 'price', order: 'desc', label: 'Maior preço' },
  'stock-asc': { sort: 'stock', order: 'asc', label: 'Menor estoque' },
  'createdAt-desc': { sort: 'createdAt', order: 'desc', label: 'Mais recentes' },
} as const;
type SortKey = keyof typeof SORT_OPTIONS;

/** Filtros persistidos na URL: compartilháveis e preservados ao voltar. */
function useProductFilters() {
  const [params, setParams] = useSearchParams();
  const availabilityParam = params.get('disponibilidade');
  const sortParam = params.get('ordem') as SortKey | null;

  const filters = {
    search: params.get('busca') ?? '',
    categoryId: params.get('categoria') ?? '',
    availability: AVAILABILITY_VALUES.find((value) => value === availabilityParam) ?? ('' as const),
    sort: sortParam && sortParam in SORT_OPTIONS ? sortParam : ('name-asc' as SortKey),
    page: Math.max(1, Number(params.get('pagina')) || 1),
  };

  const update = (changes: Partial<Record<'busca' | 'categoria' | 'disponibilidade' | 'ordem' | 'pagina', string>>) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        if (!('pagina' in changes)) next.delete('pagina');
        return next;
      },
      { replace: true },
    );
  };

  return { filters, update };
}

export function ProductsPage() {
  const { filters, update } = useProductFilters();
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchDraft.trim());
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);

  // A busca digitada vai para a URL após o debounce.
  const syncSearch = useEffectEvent((value: string) => {
    if (value !== filters.search) update({ busca: value });
  });
  useEffect(() => {
    syncSearch(debouncedSearch);
  }, [debouncedSearch]);

  const sort = SORT_OPTIONS[filters.sort];
  const params: ProductListParams = {
    page: filters.page,
    pageSize: 12,
    search: filters.search || undefined,
    categoryId: filters.categoryId || undefined,
    availability: filters.availability || undefined,
    sort: sort.sort,
    order: sort.order,
  };

  const products = useProducts(params);
  const categories = useCategories(true);
  const updateProduct = useUpdateProduct();
  const adjustStock = useAdjustStock();
  const invalidate = useInvalidateCatalog();

  const remove = useMutation({
    mutationFn: (product: Product) => productsApi.remove(product.id),
    onSuccess: async (result, product) => {
      await invalidate();
      setDeleting(null);
      toast.success(
        result.archived
          ? `"${product.name}" foi arquivado para preservar o histórico de vendas.`
          : `"${product.name}" foi excluído.`,
      );
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (product: Product) => {
    setEditing(product);
    setFormOpen(true);
  };

  const toggleAvailability = (product: Product, isAvailable: boolean) =>
    updateProduct.mutate(
      { id: product.id, input: { isAvailable } },
      { onSuccess: () => toast.success(isAvailable ? `"${product.name}" voltou ao cardápio.` : `"${product.name}" foi ocultado do cardápio.`) },
    );

  const isMutatingStock = (id: string) => adjustStock.isPending && adjustStock.variables?.id === id;
  const hasFilters = !!(filters.search || filters.categoryId || filters.availability);

  return (
    <>
      <PageTitle title="Produtos" />
      <PageHeader
        title="Produtos"
        description="Cadastre, edite e controle o estoque do catálogo da cantina."
        actions={
          <Button leftIcon={<Plus />} onClick={openCreate} disabled={!categories.data}>
            Novo produto
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-2 border-b border-ink-100 p-4 md:flex-row md:items-center">
          <SearchInput value={searchDraft} onChange={setSearchDraft} placeholder="Buscar por nome ou descrição" className="md:max-w-xs" />
          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3 md:justify-end">
            <Select value={filters.categoryId} onChange={(event) => update({ categoria: event.target.value })} aria-label="Categoria">
              <option value="">Todas as categorias</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Select
              value={filters.availability}
              onChange={(event) => update({ disponibilidade: event.target.value })}
              aria-label="Disponibilidade"
            >
              <option value="">Qualquer situação</option>
              <option value="available">À venda</option>
              <option value="low_stock">Estoque baixo (≤ {LOW_STOCK_THRESHOLD})</option>
              <option value="out_of_stock">Esgotados</option>
              <option value="unavailable">Ocultos do cardápio</option>
            </Select>
            <Select value={filters.sort} onChange={(event) => update({ ordem: event.target.value })} aria-label="Ordenação">
              {Object.entries(SORT_OPTIONS).map(([key, option]) => (
                <option key={key} value={key}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {products.error ? (
          <ErrorState error={products.error} onRetry={() => void products.refetch()} />
        ) : products.isLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4].map((key) => (
              <Skeleton key={key} className="h-14" />
            ))}
          </div>
        ) : products.data && products.data.data.length > 0 ? (
          <div className={cn('transition-opacity', products.isPlaceholderData && 'opacity-60')}>
            <Table>
              <THead>
                <TR>
                  <TH>Produto</TH>
                  <TH className="hidden md:table-cell">Categoria</TH>
                  <TH>Preço</TH>
                  <TH>Estoque</TH>
                  <TH className="hidden sm:table-cell">No cardápio</TH>
                  <TH className="text-right">
                    <span className="sr-only">Ações</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {products.data.data.map((product) => (
                  <TR key={product.id} className="hover:bg-ink-25/70">
                    <TD>
                      <div className="flex items-center gap-3">
                        <div className="size-12 shrink-0 overflow-hidden rounded-xl ring-1 ring-ink-200/70">
                          <ProductImage src={product.imageUrl} name={product.name} categorySlug={product.category.slug} />
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <p className="truncate font-medium text-ink-900">{product.name}</p>
                          <p className="truncate text-xs text-ink-500">{product.description || 'Sem descrição'}</p>
                          <div className="mt-1 md:hidden">
                            <StockBadge stock={product.stock} isAvailable={product.isAvailable} />
                          </div>
                        </div>
                      </div>
                    </TD>
                    <TD className="hidden md:table-cell">
                      <Badge tone="neutral">{product.category.name}</Badge>
                    </TD>
                    <TD className="font-semibold text-ink-900 tabular-nums">{formatCurrency(product.price)}</TD>
                    <TD>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remover uma unidade de ${product.name}`}
                          disabled={product.stock === 0 || isMutatingStock(product.id)}
                          onClick={() => adjustStock.mutate({ id: product.id, delta: -1 })}
                        >
                          <Minus />
                        </Button>
                        <span
                          className={cn(
                            'min-w-8 text-center font-semibold tabular-nums',
                            product.stock === 0 ? 'text-red-600' : product.stock <= LOW_STOCK_THRESHOLD ? 'text-amber-700' : 'text-ink-900',
                          )}
                        >
                          {product.stock}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Adicionar uma unidade de ${product.name}`}
                          disabled={isMutatingStock(product.id)}
                          onClick={() => adjustStock.mutate({ id: product.id, delta: 1 })}
                        >
                          <Plus />
                        </Button>
                      </div>
                    </TD>
                    <TD className="hidden sm:table-cell">
                      <div className="flex items-center gap-3">
                        <Switch
                          size="sm"
                          checked={product.isAvailable}
                          onCheckedChange={(checked) => toggleAvailability(product, checked)}
                          label={`${product.name} disponível no cardápio`}
                          disabled={updateProduct.isPending && updateProduct.variables?.id === product.id}
                        />
                        <span className="hidden xl:inline">
                          <StockBadge stock={product.stock} isAvailable={product.isAvailable} />
                        </span>
                      </div>
                    </TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(product)} aria-label={`Editar ${product.name}`} title="Editar">
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="hover:bg-red-50 hover:text-red-600"
                          onClick={() => setDeleting(product)}
                          aria-label={`Excluir ${product.name}`}
                          title="Excluir"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="border-t border-ink-100">
              <Pagination
                page={products.data.meta.page}
                totalPages={products.data.meta.totalPages}
                total={products.data.meta.total}
                pageSize={products.data.meta.pageSize}
                onPageChange={(page) => update({ pagina: String(page) })}
                noun="produtos"
              />
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<Package />}
            title={hasFilters ? 'Nenhum produto encontrado' : 'Seu catálogo está vazio'}
            description={hasFilters ? 'Tente outros filtros ou termos de busca.' : 'Cadastre o primeiro produto para montar o cardápio.'}
            action={
              hasFilters ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchDraft('');
                    update({ busca: '', categoria: '', disponibilidade: '' });
                  }}
                >
                  Limpar filtros
                </Button>
              ) : (
                <Button leftIcon={<Plus />} onClick={openCreate} disabled={!categories.data}>
                  Novo produto
                </Button>
              )
            }
          />
        )}
      </Card>

      <ProductFormDialog open={formOpen} onClose={() => setFormOpen(false)} product={editing} categories={categories.data ?? []} />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting)}
        loading={remove.isPending}
        title={`Excluir "${deleting?.name ?? ''}"?`}
        description="O produto sai do catálogo e do cardápio. Se ele já tiver vendas, será arquivado para preservar o histórico dos pedidos."
        confirmLabel="Excluir produto"
      />
    </>
  );
}
