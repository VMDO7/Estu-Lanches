import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router/dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { CartProvider } from '@/features/cart/CartProvider';
import { queryClient } from './query-client';
import { router } from './router';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <RouterProvider router={router} />
          <Toaster
            position="top-right"
            // Abaixo do cabeçalho: nunca cobre o carrinho nem o menu da conta.
            offset={{ top: 76, right: 20 }}
            mobileOffset={{ top: 68 }}
            closeButton
            richColors
            toastOptions={{
              classNames: {
                toast: '!rounded-xl !border-ink-200/80 !shadow-elevated !font-sans',
                title: '!text-[13px] !font-semibold',
                description: '!text-[13px]',
              },
            }}
          />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
