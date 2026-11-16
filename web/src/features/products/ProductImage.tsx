import { useState } from 'react';
import { cn } from '@/lib/cn';
import { productVisual } from './product-visuals';

interface ProductImageProps {
  src: string | null | undefined;
  name: string;
  categorySlug?: string;
  className?: string;
  iconClassName?: string;
}

/**
 * Foto do produto ou, na ausência dela, uma ilustração consistente com a
 * categoria — nunca um "quadro quebrado".
 */
export function ProductImage({ src, name, categorySlug, className, iconClassName }: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        decoding="async"
        onError={() => setFailedSrc(src)}
        className={cn('size-full object-cover', className)}
      />
    );
  }

  const visual = productVisual(name, categorySlug);
  const Icon = visual.icon;

  return (
    <div
      role="img"
      aria-label={name}
      className={cn('relative flex size-full items-center justify-center overflow-hidden bg-linear-to-br', visual.surface, className)}
    >
      <div
        className="absolute inset-0 opacity-50 [background-image:radial-gradient(rgb(255_255_255/0.7)_1px,transparent_1px)] [background-size:14px_14px]"
        aria-hidden
      />
      <div className="absolute -right-6 -bottom-6 size-24 rounded-full bg-white/30 blur-xl" aria-hidden />
      <Icon className={cn('relative size-1/3 max-h-16 max-w-16', visual.iconColor, iconClassName)} strokeWidth={1.4} aria-hidden />
    </div>
  );
}
