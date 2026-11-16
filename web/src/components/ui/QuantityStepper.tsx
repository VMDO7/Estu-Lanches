import { Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  size?: 'sm' | 'md';
  /** Mostra lixeira quando a quantidade chegaria abaixo do mínimo. */
  removable?: boolean;
  label: string;
  className?: string;
}

export function QuantityStepper({ value, onChange, min = 1, max, size = 'md', removable, label, className }: QuantityStepperProps) {
  const atMin = value <= min;
  const button = cn(
    'flex items-center justify-center rounded-lg text-ink-600 transition hover:bg-white hover:text-ink-900 hover:shadow-xs disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none',
    size === 'md' ? 'size-8 [&_svg]:size-4' : 'size-7 [&_svg]:size-3.5',
  );

  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex items-center gap-0.5 rounded-xl bg-ink-100 p-0.5 ring-1 ring-ink-200/60 ring-inset', className)}
    >
      <button
        type="button"
        className={cn(button, removable && atMin && 'hover:text-red-600')}
        onClick={() => onChange(value - 1)}
        disabled={!removable && atMin}
        aria-label={removable && atMin ? 'Remover item' : 'Diminuir quantidade'}
      >
        {removable && atMin ? <Trash2 /> : <Minus />}
      </button>
      <span
        className={cn('min-w-7 text-center font-semibold text-ink-900 tabular-nums', size === 'md' ? 'text-sm' : 'text-[13px]')}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        className={button}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Aumentar quantidade"
      >
        <Plus />
      </button>
    </div>
  );
}
