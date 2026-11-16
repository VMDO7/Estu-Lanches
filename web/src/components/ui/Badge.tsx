import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'violet';

const tones: Record<BadgeTone, { badge: string; dot: string }> = {
  neutral: { badge: 'bg-ink-100 text-ink-700 ring-ink-200/80', dot: 'bg-ink-400' },
  brand: { badge: 'bg-brand-50 text-brand-700 ring-brand-200/80', dot: 'bg-brand-500' },
  success: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80', dot: 'bg-emerald-500' },
  warning: { badge: 'bg-amber-50 text-amber-800 ring-amber-200/80', dot: 'bg-amber-500' },
  danger: { badge: 'bg-red-50 text-red-700 ring-red-200/80', dot: 'bg-red-500' },
  info: { badge: 'bg-sky-50 text-sky-700 ring-sky-200/80', dot: 'bg-sky-500' },
  accent: { badge: 'bg-accent-50 text-accent-700 ring-accent-200/80', dot: 'bg-accent-500' },
  violet: { badge: 'bg-violet-50 text-violet-700 ring-violet-200/80', dot: 'bg-violet-500' },
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  icon?: ReactNode;
  dot?: boolean;
  pulse?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ tone = 'neutral', children, icon, dot, pulse, size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-xs [&_svg]:size-3' : 'px-2.5 py-1 text-[13px] [&_svg]:size-3.5',
        tones[tone].badge,
        className,
      )}
    >
      {dot && (
        <span className="relative flex size-1.5">
          {pulse && <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60', tones[tone].dot)} />}
          <span className={cn('relative inline-flex size-1.5 rounded-full', tones[tone].dot)} />
        </span>
      )}
      {icon}
      {children}
    </span>
  );
}
