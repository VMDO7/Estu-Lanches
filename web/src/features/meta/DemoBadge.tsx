import { FlaskConical } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppMeta } from './meta';

/** Sinaliza claramente quando os dados exibidos são fictícios (DEMO_MODE). */
export function DemoBadge({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const { data } = useAppMeta();
  if (!data?.demoMode) return null;

  return (
    <span
      title="Os dados exibidos são fictícios, criados para demonstração."
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ring-1 ring-inset',
        tone === 'light'
          ? 'bg-amber-50 text-amber-800 ring-amber-200'
          : 'bg-amber-400/10 text-amber-300 ring-amber-400/25',
        className,
      )}
    >
      <FlaskConical className="size-3.5" aria-hidden />
      Ambiente de demonstração
    </span>
  );
}
