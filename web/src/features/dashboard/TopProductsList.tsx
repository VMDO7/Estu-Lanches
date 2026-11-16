import { formatCurrency, formatNumber } from '@/lib/format';
import type { TopProduct } from '@/types/api';
import { ProductImage } from '../products/ProductImage';

/**
 * Ranking em barras horizontais (uma cor, maior primeiro). Todos os valores
 * ficam visíveis em texto — nada depende de hover.
 */
export function TopProductsList({ products }: { products: TopProduct[] }) {
  const max = Math.max(...products.map((product) => product.quantity), 1);

  return (
    <ol className="space-y-4">
      {products.map((product, index) => (
        <li key={product.productId} className="flex items-center gap-3">
          <span className="w-4 text-right text-xs font-semibold text-ink-400 tabular-nums">{index + 1}</span>
          <div className="size-9 shrink-0 overflow-hidden rounded-lg ring-1 ring-ink-200/70">
            <ProductImage src={product.imageUrl} name={product.name} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-[13px] font-medium text-ink-900">{product.name}</p>
              <p className="shrink-0 text-[13px] font-semibold text-ink-900 tabular-nums">
                {formatNumber(product.quantity)} <span className="font-normal text-ink-500">un.</span>
              </p>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-[var(--color-chart-series)] transition-[width] duration-700"
                  style={{ width: `${(product.quantity / max) * 100}%` }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-xs text-ink-500 tabular-nums">{formatCurrency(product.revenue)}</span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
