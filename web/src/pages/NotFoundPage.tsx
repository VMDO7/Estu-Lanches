import { ArrowLeft, UtensilsCrossed } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { PageTitle } from '@/components/ui/PageHeader';
import { homePathFor } from '@/features/auth/auth.api';
import { useAuth } from '@/features/auth/useAuth';

export function NotFoundPage() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-dvh flex-col bg-ink-25">
      <PageTitle title="Página não encontrada" />
      <header className="px-6 py-5">
        <Logo />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-soft ring-1 ring-ink-200/70">
          <UtensilsCrossed className="size-7" aria-hidden />
        </span>
        <p className="mt-6 font-mono text-sm font-semibold text-brand-600">Erro 404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink-950">Esse prato não está no cardápio</h1>
        <p className="mt-3 max-w-md text-ink-500">A página que você procurou não existe ou foi movida.</p>
        <ButtonLink to={user ? homePathFor(user.role) : '/'} className="mt-8" leftIcon={<ArrowLeft />}>
          Voltar para o início
        </ButtonLink>
      </main>
    </div>
  );
}
