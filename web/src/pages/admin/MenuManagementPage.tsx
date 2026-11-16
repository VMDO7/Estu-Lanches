import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, BookOpen, Check, Eye, EyeOff, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Field, Input } from '@/components/ui/Input';
import { PageHeader, PageTitle } from '@/components/ui/PageHeader';
import { Switch } from '@/components/ui/Switch';
import { categoryKeys, useCategories, useCategoryMutations } from '@/features/categories/categories.api';
import { categoryIcon } from '@/features/products/product-visuals';
import { ProductImage } from '@/features/products/ProductImage';
import { useCatalog, useUpdateProduct } from '@/features/products/products.api';
import { StockBadge } from '@/features/products/StockBadge';
import { cn } from '@/lib/cn';
import { formatCurrency, pluralize } from '@/lib/format';
import type { Category, Product } from '@/types/api';

export function MenuManagementPage() {
  const categories = useCategories(true);
  const catalog = useCatalog();
  const mutations = useCategoryMutations();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const productsByCategory = new Map<string, Product[]>();
  for (const product of catalog.data ?? []) {
    const list = productsByCategory.get(product.category.id) ?? [];
    list.push(product);
    productsByCategory.set(product.category.id, list);
  }

  const visibleCategories = categories.data?.filter((category) => category.isActive).length ?? 0;
  const onMenu = (catalog.data ?? []).filter(
    (product) => product.isAvailable && product.stock > 0 && categories.data?.find((c) => c.id === product.category.id)?.isActive,
  ).length;
  const soldOut = (catalog.data ?? []).filter((product) => product.isAvailable && product.stock === 0).length;
  const hidden = (catalog.data ?? []).filter((product) => !product.isAvailable).length;

  const move = (index: number, direction: -1 | 1) => {
    const list = categories.data;
    if (!list) return;
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const reordered = [...list];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved!);
    // Atualização otimista: a ordem muda na hora, a API confirma em seguida.
    queryClient.setQueryData(categoryKeys.list(true), reordered.map((category, sortOrder) => ({ ...category, sortOrder })));
    mutations.reorder.mutate(reordered.map((category) => category.id));
  };

  const loading = categories.isLoading || catalog.isLoading;
  const error = categories.error ?? catalog.error;

  return (
    <>
      <PageTitle title="Cardápio" />
      <PageHeader
        title="Cardápio"
        description="Organize as categorias e controle o que os estudantes veem agora."
        actions={
          <Button leftIcon={<Plus />} onClick={() => setCreateOpen(true)}>
            Nova categoria
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge size="md" tone="brand" icon={<Eye />}>
          {pluralize(visibleCategories, 'categoria visível', 'categorias visíveis')}
        </Badge>
        <Badge size="md" tone="success" dot>
          {pluralize(onMenu, 'produto à venda', 'produtos à venda')}
        </Badge>
        {soldOut > 0 && (
          <Badge size="md" tone="danger" dot>
            {pluralize(soldOut, 'esgotado', 'esgotados')}
          </Badge>
        )}
        {hidden > 0 && (
          <Badge size="md" tone="neutral" icon={<EyeOff />}>
            {pluralize(hidden, 'oculto', 'ocultos')}
          </Badge>
        )}
      </div>

      {error ? (
        <Card>
          <ErrorState
            error={error}
            onRetry={() => {
              void categories.refetch();
              void catalog.refetch();
            }}
          />
        </Card>
      ) : loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : categories.data && categories.data.length > 0 ? (
        <div className="space-y-4">
          {categories.data.map((category, index) => (
            <CategorySection
              key={category.id}
              category={category}
              products={productsByCategory.get(category.id) ?? []}
              isFirst={index === 0}
              isLast={index === categories.data.length - 1}
              onMove={(direction) => move(index, direction)}
              onDelete={() => setDeleting(category)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<BookOpen />}
            title="Nenhuma categoria criada"
            description="Crie categorias como Salgados, Doces e Bebidas para organizar o cardápio."
            action={
              <Button leftIcon={<Plus />} onClick={() => setCreateOpen(true)}>
                Nova categoria
              </Button>
            }
          />
        </Card>
      )}

      <CreateCategoryDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && mutations.remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        loading={mutations.remove.isPending}
        title={`Excluir a categoria "${deleting?.name ?? ''}"?`}
        description="Só é possível excluir categorias sem produtos vinculados (inclusive arquivados). Para tirar do ar sem excluir, desative a visibilidade."
        confirmLabel="Excluir categoria"
      />
    </>
  );
}

interface CategorySectionProps {
  category: Category;
  products: Product[];
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}

function CategorySection({ category, products, isFirst, isLast, onMove, onDelete }: CategorySectionProps) {
  const { update } = useCategoryMutations();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(category.name);
  const Icon = categoryIcon(category.slug);

  const submitRename = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed === category.name) {
      setRenaming(false);
      setName(category.name);
      return;
    }
    update.mutate(
      { id: category.id, input: { name: trimmed } },
      {
        onSuccess: () => {
          setRenaming(false);
          toast.success('Categoria renomeada.');
        },
      },
    );
  };

  return (
    <Card className={cn('overflow-hidden transition-opacity', !category.isActive && 'opacity-75')}>
      <div className="flex flex-col gap-3 border-b border-ink-100 bg-ink-25/60 px-5 py-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-xs ring-1 ring-ink-200/70">
            <Icon className="size-5" aria-hidden />
          </span>
          {renaming ? (
            <form onSubmit={submitRename} className="flex flex-1 items-center gap-2">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={60}
                autoFocus
                aria-label="Novo nome da categoria"
                className="h-9 max-w-xs"
              />
              <Button type="submit" size="icon-sm" loading={update.isPending} aria-label="Salvar nome">
                <Check />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Cancelar"
                onClick={() => {
                  setRenaming(false);
                  setName(category.name);
                }}
              >
                <X />
              </Button>
            </form>
          ) : (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[15px] font-semibold text-ink-950">{category.name}</h2>
                <button
                  type="button"
                  onClick={() => setRenaming(true)}
                  className="rounded-md p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                  aria-label={`Renomear ${category.name}`}
                >
                  <Pencil className="size-3.5" />
                </button>
                {!category.isActive && <Badge tone="neutral">Oculta</Badge>}
              </div>
              <p className="text-xs text-ink-500">{pluralize(category.productCount, 'produto', 'produtos')}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="mr-2 flex items-center gap-2 text-[13px] text-ink-600">
            <Switch
              size="sm"
              checked={category.isActive}
              onCheckedChange={(isActive) =>
                update.mutate(
                  { id: category.id, input: { isActive } },
                  { onSuccess: () => toast.success(isActive ? `"${category.name}" visível no cardápio.` : `"${category.name}" ocultada do cardápio.`) },
                )
              }
              label={`Categoria ${category.name} visível no cardápio`}
            />
            Visível
          </label>
          <Button variant="ghost" size="icon-sm" onClick={() => onMove(-1)} disabled={isFirst} aria-label="Mover para cima" title="Mover para cima">
            <ArrowUp />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => onMove(1)} disabled={isLast} aria-label="Mover para baixo" title="Mover para baixo">
            <ArrowDown />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="hover:bg-red-50 hover:text-red-600"
            onClick={onDelete}
            aria-label={`Excluir ${category.name}`}
            title="Excluir categoria"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-5 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-ink-500">Nenhum produto nesta categoria ainda.</p>
          <ButtonLink to="/admin/produtos" variant="secondary" size="sm" leftIcon={<Plus />}>
            Cadastrar produto
          </ButtonLink>
        </div>
      ) : (
        <ul className="divide-y divide-ink-100">
          {products.map((product) => (
            <MenuProductRow key={product.id} product={product} categorySlug={category.slug} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function MenuProductRow({ product, categorySlug }: { product: Product; categorySlug: string }) {
  const update = useUpdateProduct();
  const [editingPrice, setEditingPrice] = useState(false);
  const [price, setPrice] = useState(product.price);

  const savePrice = () => {
    if (price <= 0 || Math.abs(price - product.price) < 0.001) {
      setEditingPrice(false);
      setPrice(product.price);
      return;
    }
    update.mutate(
      { id: product.id, input: { price } },
      {
        onSuccess: () => {
          setEditingPrice(false);
          toast.success(`Preço de "${product.name}" atualizado para ${formatCurrency(price)}.`);
        },
        onError: () => setPrice(product.price),
      },
    );
  };

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
      <div className="size-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-ink-200/70">
        <ProductImage src={product.imageUrl} name={product.name} categorySlug={categorySlug} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink-900">{product.name}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-500">
          <StockBadge stock={product.stock} isAvailable={product.isAvailable} />
          <span className="tabular-nums">{product.stock} em estoque</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {editingPrice ? (
          <div className="w-32">
            <CurrencyInput
              value={price}
              onValueChange={setPrice}
              autoFocus
              aria-label={`Preço de ${product.name}`}
              className="h-9"
              onBlur={savePrice}
              onKeyDown={(event) => {
                if (event.key === 'Enter') savePrice();
                if (event.key === 'Escape') {
                  setEditingPrice(false);
                  setPrice(product.price);
                }
              }}
              disabled={update.isPending}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingPrice(true)}
            className="group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-ink-900 tabular-nums transition hover:bg-ink-100"
            aria-label={`Alterar preço de ${product.name} (atual ${formatCurrency(product.price)})`}
          >
            {formatCurrency(product.price)}
            <Pencil className="size-3.5 text-ink-300 group-hover:text-ink-600" aria-hidden />
          </button>
        )}
        <Switch
          size="sm"
          checked={product.isAvailable}
          onCheckedChange={(isAvailable) => update.mutate({ id: product.id, input: { isAvailable } })}
          label={`${product.name} disponível no cardápio`}
          disabled={update.isPending}
        />
      </div>
    </li>
  );
}

function CreateCategoryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { create } = useCategoryMutations();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setName('');
    setError(null);
    onClose();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('O nome deve ter ao menos 2 caracteres.');
      return;
    }
    create.mutate(trimmed, { onSuccess: close });
  };

  return (
    <Dialog open={open} onClose={close} size="sm" title="Nova categoria" description="Ela aparece no fim do cardápio; reordene quando quiser." locked={create.isPending}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Nome" htmlFor="category-name" error={error ?? undefined} required>
          <Input
            id="category-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            placeholder="Ex.: Combos"
            maxLength={60}
            autoFocus
            invalid={!!error}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={create.isPending}>
            Criar categoria
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
