import { ClipboardList, Hash, LogOut, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { Logo } from '@/components/brand/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { Skeleton } from '@/components/ui/Feedback';
import { useAuth } from '@/features/auth/useAuth';
import { CartDrawer } from '@/features/cart/CartDrawer';
import { useCart } from '@/features/cart/useCart';
import { DemoBadge } from '@/features/meta/DemoBadge';
import { useOrders } from '@/features/orders/orders.api';
import { cn } from '@/lib/cn';

function useActiveOrdersCount() {
  const { data } = useOrders({ scope: 'active', pageSize: 1 }, { refetchInterval: 20_000 });
  return data?.meta.total ?? 0;
}

function CartButton({ className }: { className?: string }) {
  const cart = useCart();
  return (
    <button
      type="button"
      onClick={cart.open}
      className={cn(
        'relative flex h-10 items-center gap-2 rounded-xl bg-ink-900 px-3.5 text-sm font-medium text-white shadow-xs transition hover:bg-ink-800 active:scale-[0.98]',
        className,
      )}
      aria-label={`Abrir carrinho (${cart.count} itens)`}
    >
      <ShoppingBag className="size-[18px]" aria-hidden />
      <span className="hidden sm:inline">Carrinho</span>
      {cart.count > 0 && (
        <span
          key={cart.bump}
          className="flex min-w-5 animate-pop items-center justify-center rounded-full bg-accent-500 px-1.5 text-[11px] font-bold tabular-nums"
        >
          {cart.count}
        </span>
      )}
    </button>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <Dropdown
      trigger={({ open, toggle, id }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={id}
          aria-haspopup="menu"
          className="rounded-full transition hover:opacity-90"
          aria-label="Menu da conta"
        >
          <Avatar name={user.name} size="sm" />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="px-2.5 pt-1.5 pb-2.5">
            <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
            <p className="truncate text-xs text-ink-500">{user.email}</p>
            {user.student && (
              <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-ink-500">
                <Hash className="size-3" aria-hidden />
                {user.student.registration} · {user.student.grade}
              </p>
            )}
          </div>
          <div className="my-1 h-px bg-ink-100" />
          <DropdownItem
            tone="danger"
            icon={<LogOut />}
            onClick={() => {
              close();
              void logout();
            }}
          >
            Sair da conta
          </DropdownItem>
        </>
      )}
    </Dropdown>
  );
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors',
    isActive ? 'bg-ink-100 text-ink-950' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900',
  );

function MobileTabBar({ activeOrders }: { activeOrders: number }) {
  const cart = useCart();
  const tab = ({ isActive }: { isActive: boolean }) =>
    cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium', isActive ? 'text-brand-700' : 'text-ink-500');

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-ink-200/70 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      aria-label="Navegação principal"
    >
      <NavLink to="/aluno" end className={tab}>
        <UtensilsCrossed className="size-5" aria-hidden />
        Cardápio
      </NavLink>
      <NavLink to="/aluno/pedidos" className={tab}>
        <span className="relative">
          <ClipboardList className="size-5" aria-hidden />
          {activeOrders > 0 && <span className="absolute -top-0.5 -right-1 size-2 rounded-full bg-accent-500 ring-2 ring-white" />}
        </span>
        Pedidos
      </NavLink>
      <button type="button" onClick={cart.open} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-ink-500">
        <span className="relative">
          <ShoppingBag className="size-5" aria-hidden />
          {cart.count > 0 && (
            <span
              key={cart.bump}
              className="absolute -top-1.5 -right-2.5 flex min-w-4 animate-pop items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white tabular-nums"
            >
              {cart.count}
            </span>
          )}
        </span>
        Carrinho
      </button>
    </nav>
  );
}

export function StudentLayout() {
  const activeOrders = useActiveOrdersCount();

  return (
    <div className="min-h-dvh bg-ink-25 pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-ink-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/aluno" aria-label="EstuLanches — cardápio">
            <Logo size="sm" />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
            <NavLink to="/aluno" end className={navLinkClass}>
              Cardápio
            </NavLink>
            <NavLink to="/aluno/pedidos" className={navLinkClass}>
              Meus pedidos
              {activeOrders > 0 && (
                <span className="rounded-full bg-accent-500 px-1.5 text-[11px] font-semibold text-white tabular-nums">
                  {activeOrders}
                </span>
              )}
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <DemoBadge className="hidden lg:inline-flex" />
            <CartButton className="hidden md:flex" />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <Suspense
          fallback={
            <div className="space-y-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-64 rounded-2xl" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      <MobileTabBar activeOrders={activeOrders} />
      <CartDrawer />
    </div>
  );
}
