import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface Option<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<Option<T>>;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}

/** Grupo de abas compacto (filtros de período, visualizações, status). */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('scrollbar-none inline-flex max-w-full overflow-x-auto rounded-xl bg-ink-100/80 p-1 ring-1 ring-ink-200/50 ring-inset', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-all duration-150 [&_svg]:size-4',
              size === 'md' ? 'h-8 px-3 text-[13px]' : 'h-7 px-2.5 text-xs',
              active ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {option.icon}
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px] tabular-nums',
                  active ? 'bg-brand-50 text-brand-700' : 'bg-ink-200/70 text-ink-600',
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
