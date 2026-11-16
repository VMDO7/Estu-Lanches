import { LoaderCircle } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cn } from '@/lib/cn';

const variants = {
  primary:
    'bg-brand-600 text-white shadow-xs hover:bg-brand-700 active:bg-brand-800 focus-visible:outline-brand-600',
  secondary:
    'bg-white text-ink-800 shadow-xs ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:ring-ink-300 active:bg-ink-100',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 active:bg-ink-200/70',
  danger: 'bg-red-600 text-white shadow-xs hover:bg-red-700 active:bg-red-800 focus-visible:outline-red-600',
  'danger-soft': 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-100',
  accent: 'bg-accent-500 text-white shadow-xs hover:bg-accent-600 active:bg-accent-700',
  dark: 'bg-ink-900 text-white shadow-xs hover:bg-ink-800 active:bg-ink-950',
  soft: 'bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200/70 hover:bg-brand-100',
} as const;

const sizes = {
  xs: 'h-7 gap-1 rounded-md px-2.5 text-xs [&_svg]:size-3.5',
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-[13px] [&_svg]:size-4',
  md: 'h-10 gap-2 rounded-lg px-4 text-sm [&_svg]:size-4',
  lg: 'h-12 gap-2 rounded-xl px-5 text-[15px] [&_svg]:size-[18px]',
  icon: 'size-9 rounded-lg [&_svg]:size-[18px]',
  'icon-sm': 'size-8 rounded-md [&_svg]:size-4',
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap select-none',
    'transition-[background-color,box-shadow,color,transform] duration-150 active:scale-[0.98]',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );
}

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  variant,
  size,
  loading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <LoaderCircle className="animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function ButtonLink({ variant, size, leftIcon, rightIcon, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonStyles({ variant, size, className: typeof className === 'string' ? className : undefined })} {...props}>
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  );
}
