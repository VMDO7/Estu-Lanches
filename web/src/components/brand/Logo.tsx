import { useId } from 'react';
import { cn } from '@/lib/cn';

/** Símbolo: um "E" em camadas de sanduíche (o recheio em âmbar) com uma mordida no canto. */
export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn('size-8', className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#12B76A" />
          <stop offset="1" stopColor="#027A48" />
        </linearGradient>
        <mask id={`${id}-bite`}>
          <rect width="32" height="32" fill="#fff" />
          <circle cx="31.5" cy="2.5" r="5.5" fill="#000" />
        </mask>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id}-g)`} mask={`url(#${id}-bite)`} />
      <rect x="8.5" y="8" width="4" height="16" rx="2" fill="#fff" />
      <rect x="8.5" y="8" width="14.5" height="4" rx="2" fill="#fff" />
      <rect x="8.5" y="14" width="11" height="4" rx="2" fill="#FDB022" />
      <rect x="8.5" y="20" width="14.5" height="4" rx="2" fill="#fff" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  tone?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, tone = 'dark', size = 'md' }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={size === 'lg' ? 'size-10' : size === 'sm' ? 'size-7' : 'size-8'} />
      <span
        className={cn(
          'font-semibold tracking-[-0.02em]',
          size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg',
          tone === 'dark' ? 'text-ink-950' : 'text-white',
        )}
      >
        Estu<span className={tone === 'dark' ? 'text-brand-600' : 'text-brand-400'}>Lanches</span>
      </span>
    </span>
  );
}
