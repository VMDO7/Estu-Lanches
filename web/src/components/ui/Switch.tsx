import { cn } from '@/lib/cn';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  label: string;
  id?: string;
  className?: string;
}

export function Switch({ checked, onCheckedChange, disabled, size = 'md', label, id, className }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'h-6 w-11' : 'h-5 w-9',
        checked ? 'bg-brand-600' : 'bg-ink-200 hover:bg-ink-300',
        className,
      )}
    >
      <span
        className={cn(
          'inline-block rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.2)] transition-transform duration-200',
          size === 'md' ? 'size-5' : 'size-4',
          checked ? (size === 'md' ? 'translate-x-[22px]' : 'translate-x-[18px]') : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
