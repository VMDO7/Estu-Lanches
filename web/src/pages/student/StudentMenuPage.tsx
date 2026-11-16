import { ArrowRight, ChevronRight, SearchX, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { PageTitle } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { useAuth } from '@/features/auth/useAuth';
import { useCart } from '@/features/cart/useCart';
import { useMenu } from '@/features/menu/menu.api';
import { ProductCard } from '@/features/menu/ProductCard';
import { ORDER_STATUS } from '@/features/orders/order-status';
import { useOrders } from '@/features/orders/orders.api';
import { categoryIcon } from '@/features/products/product-visuals';
import { cn } from '@/lib/cn';
import { firstName, formatCurrency, formatOrderCode, greeting, pluralize } from '@/lib/format';

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export function StudentMenuPage() {
  const { user } = useAuth();
  const cart = useCart();
  const menu = useMenu();
  const activeOrders = useOrders({ scope: 'active', pageSize: 3, sort: 'newest' }, { refetchInterval: 15_000 });
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    return (menu.data ?? [])
      .filter((category) => activeCategory === 'all' || category.id === activeCategory)
      .map((category) => ({
        ...category,
        products: term
          ? category.products.filter((product) => normalize(`${product.name} ${product.description}`).includes(term))
          : category.products,
      }))
      .filter((category) => category.products.length > 0);
  }, [menu.data, search, activeCategory]);

  const resultCount = filtered.reduce((sum, category) => sum + category.products.length, 0);

  return (
    <>
      <PageTitle title="Cardápio" />

      <section className="mb-6 animate-fade-in">
        <p className="text-sm font-medium text-brand-700">
          {greeting()}, {user ? firstName(user.name) : ''}
        </p>
        <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight text-ink-950 sm:text-3xl">O que vai ser hoje?</h1>
      </section>

      {activeOrders.data && activeOrders.data.data.length > 0 && (
        <div className="mb-6 space-y-2">
          {activeOrders.data.data.map((order) => {
            const config = ORDER_STATUS[order.status];
            const Icon = config.icon;
            return (
              <Link
                key={order.id}
                to={`/aluno/pedidos/${order.id}`}
                className={cn(
                  'flex items-center gap-4 rounded-2xl border px-4 py-3.5 shadow-card transition hover:shadow-soft',
                  order.status === 'READY'
                    ? 'border-brand-200 bg-linear-to-r from-brand-50 to-white'
                    : 'border-ink-200/70 bg-white',
                )}
              >
                <span
                  className={cn(
                    'relative flex size-10 shrink-0 items-center justify-center rounded-xl',
                    order.status === 'READY' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600',
                  )}
                >
                  {order.status === 'READY' && <span className="absolute inset-0 animate-ping rounded-xl bg-brand-400/40" aria-hidden />}
                  <Icon className="relative size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-950">
                    Pedido <span className="font-mono">{formatOrderCode(order.code)}</span> · {config.label}
                  </p>
                  <p className="truncate text-[13px] text-ink-500">{config.description}</p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-ink-400" aria-hidden />
              </Link>
            );
          })}
        </div>
      )}

      {/* Busca e categorias (fixas ao rolar) */}
      <div className="sticky top-16 z-20 -mx-4 mb-6 border-b border-ink-200/50 bg-ink-25/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar no cardápio" className="md:max-w-xs" />
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="tablist" aria-label="Categorias">
            <CategoryChip active={activeCategory === 'all'} onClick={() => setActiveCategory('all')} icon={UtensilsCrossed} label="Tudo" />
            {menu.data?.map((category) => (
              <CategoryChip
                key={category.id}
                active={activeCategory === category.id}
                onClick={() => setActiveCategory(category.id)}
                icon={categoryIcon(category.slug)}
                label={category.name}
              />
            ))}
          </div>
        </div>
      </div>

      {menu.error ? (
        <Card>
          <ErrorState error={menu.error} onRetry={() => void menu.refetch()} title="Não foi possível carregar o cardápio" />
        </Card>
      ) : menu.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white">
              <Skeleton className="aspect-[4/3] rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="mt-4 h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : menu.data && menu.data.length === 0 ? (
        <Card>
          <EmptyState
            icon={<UtensilsCrossed />}
            title="O cardápio está sendo preparado"
            description="A cantina ainda não publicou produtos. Volte daqui a pouco!"
          />
        </Card>
      ) : resultCount === 0 ? (
        <Card>
          <EmptyState
            icon={<SearchX />}
            title="Nada encontrado"
            description={`Não achamos itens para “${search}”. Tente outro termo ou categoria.`}
          />
        </Card>
      ) : (
        <div className="space-y-10">
          {filtered.map((category) => (
            <section key={category.id} aria-labelledby={`category-${category.id}`}>
              <div className="mb-4 flex items-baseline justify-between">
                <h2 id={`category-${category.id}`} className="text-lg font-semibold tracking-tight text-ink-950">
                  {category.name}
                </h2>
                <span className="text-[13px] text-ink-500">{pluralize(category.products.length, 'item', 'itens')}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {category.products.map((product, index) => (
                  <ProductCard key={product.id} product={product} categorySlug={category.slug} index={index} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Atalho flutuante do carrinho no celular (+ espaço para não cobrir o fim da lista) */}
      {cart.count > 0 && <div className="h-20 md:hidden" aria-hidden />}
      {cart.count > 0 && (
        <button
          type="button"
          onClick={cart.open}
          className="fixed inset-x-4 bottom-20 z-20 flex animate-slide-up items-center gap-3 rounded-2xl bg-ink-950 px-4 py-3.5 text-left text-white shadow-elevated md:hidden"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/10">
            <ShoppingBag className="size-[18px]" aria-hidden />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">Ver carrinho</span>
            <span className="block text-xs text-ink-300">{pluralize(cart.count, 'item', 'itens')}</span>
          </span>
          <span className="text-sm font-semibold tabular-nums">{formatCurrency(cart.subtotal)}</span>
          <ArrowRight className="size-4" aria-hidden />
        </button>
      )}
    </>
  );
}

function CategoryChip({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof UtensilsCrossed;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-all',
        active
          ? 'bg-ink-950 text-white shadow-soft'
          : 'bg-white text-ink-600 ring-1 ring-ink-200 ring-inset hover:text-ink-900 hover:ring-ink-300',
      )}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </button>
  );
}
