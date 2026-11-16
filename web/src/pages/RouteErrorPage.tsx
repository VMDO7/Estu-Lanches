import { RefreshCw, TriangleAlert } from 'lucide-react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Button } from '@/components/ui/Button';
import { NotFoundPage } from './NotFoundPage';

/** Falhas inesperadas de renderização: mensagem amigável, sem detalhes técnicos. */
export function RouteErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  const isChunkError = error instanceof Error && /dynamically imported module|Loading chunk/i.test(error.message);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-ink-25 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
        <TriangleAlert className="size-6" aria-hidden />
      </span>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink-950">
        {isChunkError ? 'Uma nova versão está disponível' : 'Algo deu errado'}
      </h1>
      <p className="mt-2 max-w-md text-ink-500">
        {isChunkError
          ? 'O EstuLanches foi atualizado. Recarregue a página para continuar.'
          : 'Encontramos um problema inesperado. Recarregue a página — se persistir, tente novamente em instantes.'}
      </p>
      <Button className="mt-8" leftIcon={<RefreshCw />} onClick={() => window.location.reload()}>
        Recarregar página
      </Button>
    </div>
  );
}
