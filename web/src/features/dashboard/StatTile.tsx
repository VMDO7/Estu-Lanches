import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/Feedback';
import { cn } from '@/lib/cn';
import { percentChange } from '@/lib/format';

interface StatTileProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  footer?: ReactNode;
  delta?: {
    current: number;
    previous: number;
    comparison: string;
    /** Texto quando não há base de comparação (período anterior zerado). */
    emptyLabel?: string;
    goodWhen?: 'up' | 'down';
  };
  trend?: number[];
  loading?: boolean;
  className?: string;
}

/** Indicador: rótulo · valor · variação (vs. período nomeado) · tendência opcional. */
export function StatTile({ label, value, icon, footer, delta, trend, loading, className }: StatTileProps) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-500">{label}</p>
        <span className="flex size-8 items-center justify-center rounded-lg bg-ink-50 text-ink-500 ring-1 ring-ink-200/60 [&_svg]:size-4">
          {icon}
        </span>
      </div>

      {loading ? (
        <div className="mt-3 space-y-2.5">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
      ) : (
        <>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-[28px] leading-none font-semibold tracking-tight text-ink-950">{value}</p>
            {trend && trend.length > 1 && <Sparkline values={trend} />}
          </div>
          <div className="mt-3 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-500">
            {delta && <Delta {...delta} />}
            {footer}
          </div>
        </>
      )}
    </div>
  );
}

function Delta({ current, previous, comparison, emptyLabel = 'Sem base de comparação', goodWhen = 'up' }: NonNullable<StatTileProps['delta']>) {
  const change = percentChange(current, previous);
  if (change === null) {
    return <span className="text-ink-400">{emptyLabel}</span>;
  }
  const rounded = Math.round(change);
  const direction = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat';
  const good = direction === 'flat' ? null : direction === goodWhen;
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold',
          good === true && 'bg-emerald-50 text-emerald-700',
          good === false && 'bg-red-50 text-red-700',
          good === null && 'bg-ink-100 text-ink-600',
        )}
      >
        <Icon className="size-3.5" aria-hidden />
        {rounded > 0 ? '+' : ''}
        {rounded}%
      </span>
      <span>{comparison}</span>
    </span>
  );
}

/** Mini tendência: linha na cor de contexto, ponto atual em destaque. */
function Sparkline({ values, width = 84, height = 32 }: { values: number[]; width?: number; height?: number }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((value, index) => [index * step, height - 4 - ((value - min) / range) * (height - 8)] as const);
  const path = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lastX, lastY] = points[points.length - 1]!;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0 overflow-visible" aria-hidden>
      <path d={path} fill="none" stroke="var(--color-chart-muted)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={4} fill="var(--color-chart-series)" stroke="white" strokeWidth={2} />
    </svg>
  );
}
