import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter, Outlet, ScrollRestoration } from 'react-router';
import { FullPageLoader } from '@/components/ui/Feedback';
import { GuestOnly, RequireRole } from '@/features/auth/guards';
import { AdminLayout } from '@/layouts/AdminLayout';
import { StudentLayout } from '@/layouts/StudentLayout';
import { LandingPage } from '@/pages/LandingPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RouteErrorPage } from '@/pages/RouteErrorPage';

/** Code splitting por página: o painel (com gráficos) não pesa para o estudante. */
function lazyPage<T extends Record<string, unknown>>(loader: () => Promise<T>, name: keyof T) {
  return lazy(async () => ({ default: (await loader())[name] as ComponentType }));
}

const LoginPage = lazyPage(() => import('@/pages/auth/LoginPage'), 'LoginPage');
const RegisterPage = lazyPage(() => import('@/pages/auth/RegisterPage'), 'RegisterPage');

const DashboardPage = lazyPage(() => import('@/pages/admin/DashboardPage'), 'DashboardPage');
const OrdersPage = lazyPage(() => import('@/pages/admin/OrdersPage'), 'OrdersPage');
const ProductsPage = lazyPage(() => import('@/pages/admin/ProductsPage'), 'ProductsPage');
const MenuManagementPage = lazyPage(() => import('@/pages/admin/MenuManagementPage'), 'MenuManagementPage');
const StudentsPage = lazyPage(() => import('@/pages/admin/StudentsPage'), 'StudentsPage');
const StudentDetailPage = lazyPage(() => import('@/pages/admin/StudentDetailPage'), 'StudentDetailPage');

const StudentMenuPage = lazyPage(() => import('@/pages/student/StudentMenuPage'), 'StudentMenuPage');
const CheckoutPage = lazyPage(() => import('@/pages/student/CheckoutPage'), 'CheckoutPage');
const MyOrdersPage = lazyPage(() => import('@/pages/student/MyOrdersPage'), 'MyOrdersPage');
const StudentOrderPage = lazyPage(() => import('@/pages/student/StudentOrderPage'), 'StudentOrderPage');

function RootLayout() {
  return (
    <>
      <Suspense fallback={<FullPageLoader />}>
        <Outlet />
      </Suspense>
      <ScrollRestoration />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <GuestOnly><LoginPage /></GuestOnly> },
      { path: '/cadastro', element: <GuestOnly><RegisterPage /></GuestOnly> },
      {
        path: '/admin',
        element: (
          <RequireRole role="ADMIN">
            <AdminLayout />
          </RequireRole>
        ),
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'pedidos', element: <OrdersPage /> },
          { path: 'produtos', element: <ProductsPage /> },
          { path: 'cardapio', element: <MenuManagementPage /> },
          { path: 'estudantes', element: <StudentsPage /> },
          { path: 'estudantes/:id', element: <StudentDetailPage /> },
        ],
      },
      {
        path: '/aluno',
        element: (
          <RequireRole role="STUDENT">
            <StudentLayout />
          </RequireRole>
        ),
        children: [
          { index: true, element: <StudentMenuPage /> },
          { path: 'checkout', element: <CheckoutPage /> },
          { path: 'pedidos', element: <MyOrdersPage /> },
          { path: 'pedidos/:id', element: <StudentOrderPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
