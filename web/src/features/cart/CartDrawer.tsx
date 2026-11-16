import { ArrowRight, ShoppingBag, TriangleAlert } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/Feedback';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { formatCurrency, pluralize } from '@/lib/format';
import { useMenu } from '../menu/menu.api';
import { ProductImage } from '../products/ProductImage';
import { useCart, useCartReview, type ReviewedLine } from './useCart';

export function issueMessage(line: ReviewedLine) {
  switch (line.issue) {
    case 'unavailable':
      return 'Indisponível no momento — remova para continuar.';
    case 'out_of_stock':
      return 'Esgotado — remova para continuar.';
    case 'insufficient_stock':
      return `Restam apenas ${line.product?.stock} unidades.`;
    default:
      return null;
  }
}

export function CartDrawer() {
  const cart = useCart();
  const { data: menu } = useMenu();
  const review = useCartReview(menu);
  const navigate = useNavigate();

  const goToCheckout = () => {
    cart.close();
    void navigate('/aluno/checkout');
  };

  return (
    <Drawer
      open={cart.isOpen}
      onClose={cart.close}
      title="Seu carrinho"
      description={cart.count > 0 ? pluralize(cart.count, 'item', 'itens') : undefined}
      footer={
        cart.count > 0 ? (
          <div className="space-y-4">
            {review.hasIssues && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                Ajuste os itens destacados para finalizar o pedido.
              </p>
            )}
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink-500">Total</span>
              <span className="text-xl font-semibold tracking-tight text-ink-950">{formatCurrency(cart.subtotal)}</span>
            </div>
            <Button size="lg" className="w-full" rightIcon={<ArrowRight />} onClick={goToCheckout} disabled={review.hasIssues}>
              Finalizar pedido
            </Button>
          </div>
        ) : undefined
      }
    >
      {cart.count === 0 ? (
        <EmptyState
          icon={<ShoppingBag />}
          title="Seu carrinho está vazio"
          description="Escolha seus lanches no cardápio — eles aparecem aqui."
          action={
            <Button variant="secondary" onClick={cart.close}>
              Ver cardápio
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-ink-100">
          {review.lines.map((line) => {
            const message = issueMessage(line);
            return (
              <li key={line.productId} className="flex gap-3.5 px-5 py-4">
                <div className="size-16 shrink-0 overflow-hidden rounded-xl ring-1 ring-ink-200/70">
                  <ProductImage src={line.imageUrl} name={line.name} categorySlug={line.categorySlug} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm leading-snug font-medium text-ink-900">{line.name}</p>
                    <p className="text-sm font-semibold text-ink-900 tabular-nums">{formatCurrency(line.price * line.quantity)}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500 tabular-nums">{formatCurrency(line.price)} cada</p>
                  {message && <p className="mt-1.5 text-xs font-medium text-amber-700">{message}</p>}
                  <div className="mt-2.5">
                    <QuantityStepper
                      size="sm"
                      value={line.quantity}
                      max={line.maxQuantity}
                      removable
                      onChange={(quantity) => cart.setQuantity(line.productId, quantity)}
                      label={`Quantidade de ${line.name}`}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Drawer>
  );
}
