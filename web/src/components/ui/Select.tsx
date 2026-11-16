import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

interface SelectProps extends ComponentProps<'select'> {
  invalid?: boolean;
}

/** Select nativo estilizado: acessível e confiável em qualquer dispositivo. */
export function Select({ className, invalid, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          'h-10 w-full appearance-none rounded-lg border border-ink-200 bg-white pr-9 pl-3 text-sm text-ink-900 shadow-xs transition-[border-color,box-shadow]',
          'focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none disabled:bg-ink-50 disabled:text-ink-400',
          invalid && 'border-red-400 focus:border-red-500 focus:ring-red-500/15',
          className,
        )}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
    </div>
  );
}
