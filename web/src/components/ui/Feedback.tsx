import { CircleAlert, LoaderCircle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { getErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} aria-hidden />;
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 scale-150 rounded-full bg-brand-100/50 blur-xl" aria-hidden />
        <span className="relative flex size-12 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-soft ring-1 ring-ink-200/70 [&_svg]:size-6">
          {icon}
        </span>
      </div>
      <h3 className="text-[15px] font-semibold tracking-tight text-ink-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

export function ErrorState({ error, onRetry, title = 'Não foi possível carregar', className }: ErrorStateProps) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
        <CircleAlert className="size-6" aria-hidden />
      </span>
      <h3 className="text-[15px] font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-500">{getErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" leftIcon={<RefreshCw />} onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export function Spinner({ className, label = 'Carregando' }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center text-brand-600', className)}>
      <LoaderCircle className="size-5 animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function FullPageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink-25">
      <div className="flex flex-col items-center gap-3 animate-fade-in">
        <Spinner className="[&_svg]:size-7" />
        <p className="text-sm text-ink-500">Carregando…</p>
      </div>
    </div>
  );
}
