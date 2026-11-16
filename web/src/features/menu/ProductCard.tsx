import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import type { MenuProduct } from '@/types/api';
import { MAX_ITEM_QUANTITY } from '../cart/CartProvider';
import { useCart } from '../cart/useCart';
import { ProductImage } from '../products/ProductImage';
import { LOW_STOCK_THRESHOLD } from '../products/StockBadge';

interface ProductCardProps {
  product: MenuProduct;
  categorySlug: string;
  index?: number;
}

export function ProductCard({ product, categorySlug, index = 0 }: ProductCardProps) {
  const cart = useCart();
  const line = cart.lines.find((item) => item.productId === product.id);
  const soldOut = product.stock === 0;
  const lowStock = !soldOut && product.stock <= LOW_STOCK_THRESHOLD;
  const max = Math.min(MAX_ITEM_QUANTITY, product.stock);

  const add = () => {
    cart.add({ id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, categorySlug });
    // Um único toast que se atualiza a cada adição (não empilha).
    toast.success(`${product.name} no carrinho`, {
      id: 'cart-add',
      duration: 2000,
      action: { label: 'Ver carrinho', onClick: cart.open },
    });
  };

  return (
    <article
      className={cn(
        'group flex animate-slide-up flex-col overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card transition-all duration-300',
        soldOut ? 'opacity-80' : 'hover:-translate-y-0.5 hover:shadow-soft',
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-50">
        <ProductImage
          src={product.imageUrl}
          name={product.name}
          categorySlug={categorySlug}
          className={cn('transition-transform duration-500', !soldOut && 'group-hover:scale-[1.04]', soldOut && 'grayscale')}
        />
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
            <Badge tone="neutral" size="md" className="bg-white shadow-soft">
              Esgotado
            </Badge>
          </div>
        )}
        {lowStock && (
          <Badge tone="accent" className="absolute top-3 left-3 bg-white/95 shadow-xs">
            {product.stock === 1 ? 'Última unidade' : `Últimas ${product.stock}`}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[15px] leading-snug font-semibold text-ink-950">{product.name}</h3>
        {product.description && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-500">{product.description}</p>}

        {/* Em cards estreitos (2 colunas no celular) a ação quebra para a linha de baixo. */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-4">
          <span className="text-base font-semibold tracking-tight text-ink-950">{formatCurrency(product.price)}</span>
          {line ? (
            <QuantityStepper
              size="sm"
              value={line.quantity}
              max={max}
              removable
              onChange={(quantity) => cart.setQuantity(product.id, quantity)}
              label={`Quantidade de ${product.name}`}
            />
          ) : (
            <button
              type="button"
              onClick={add}
              disabled={soldOut}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-[13px] font-semibold text-white shadow-xs transition hover:bg-brand-700 active:scale-95 disabled:bg-ink-200 disabled:text-ink-500"
              aria-label={soldOut ? `${product.name} esgotado` : `Adicionar ${product.name} ao carrinho`}
            >
              <Plus className="size-4" aria-hidden />
              {soldOut ? 'Esgotado' : 'Adicionar'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
