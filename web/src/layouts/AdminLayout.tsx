import {
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Package,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { Logo } from '@/components/brand/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Feedback';
import { useAuth } from '@/features/auth/useAuth';
import { DemoBadge } from '@/features/meta/DemoBadge';
import { useOrders } from '@/features/orders/orders.api';
import { cn } from '@/lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: number;
}

function useNavigation(): Array<{ section: string; items: NavItem[] }> {
  // Contador de pedidos em andamento, atualizado em segundo plano.
  const { data } = useOrders({ scope: 'active', pageSize: 1 }, { refetchInterval: 20_000 });
  return [
    {
      section: 'Operação',
      items: [
        { to: '/admin', label: 'Visão geral', icon: LayoutDashboard, end: true },
        { to: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList, badge: data?.meta.total },
      ],
    },
    {
      section: 'Catálogo',
      items: [
        { to: '/admin/produtos', label: 'Produtos', icon: Package },
        { to: '/admin/cardapio', label: 'Cardápio', icon: BookOpen },
      ],
    },
    { section: 'Comunidade', items: [{ to: '/admin/estudantes', label: 'Estudantes', icon: Users }] },
  ];
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link to="/admin" onClick={onNavigate} aria-label="EstuLanches — visão geral">
          <Logo size="sm" />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Navegação do painel">
        {navigation.map((group) => (
          <div key={group.section}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-ink-400 uppercase">{group.section}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                        isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-600 hover:bg-ink-100/80 hover:text-ink-900',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={cn('size-[18px]', isActive ? 'text-brand-600' : 'text-ink-400 group-hover:text-ink-600')}
                          aria-hidden
                        />
                        <span className="flex-1">{item.label}</span>
                        {!!item.badge && (
                          <span
                            className={cn(
                              'min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums',
                              isActive ? 'bg-brand-600 text-white' : 'bg-accent-500 text-white',
                            )}
                            aria-label={`${item.badge} em andamento`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-ink-200/70 p-4">
        <DemoBadge className="w-full justify-center" />
        {user && (
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-900">{user.name}</p>
              <p className="truncate text-xs text-ink-500">Administrador</p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => void logout()} aria-label="Sair" title="Sair">
              <LogOut />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PageFallback() {
  return (
    <div className="space-y-6" aria-busy>
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-ink-25">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-ink-200/70 bg-white lg:block">
        <SidebarContent />
      </aside>

      {/* Navegação móvel */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-ink-200/70 bg-white/85 px-4 backdrop-blur-xl lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
          <MenuIcon />
        </Button>
        <Logo size="sm" />
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 animate-fade-in bg-ink-950/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full w-72 max-w-[85vw] animate-[drawer-in-left_0.25s_ease-out] bg-white shadow-elevated">
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-4 right-3"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
            >
              <X />
            </Button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
