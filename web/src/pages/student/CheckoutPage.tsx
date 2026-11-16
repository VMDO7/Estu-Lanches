import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Info, ShieldCheck, ShoppingBag, TriangleAlert, Wand2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Feedback';
import { Field, Textarea } from '@/components/ui/Input';
import { PageTitle } from '@/components/ui/PageHeader';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { issueMessage } from '@/features/cart/CartDrawer';
import { useCart, useCartReview } from '@/features/cart/useCart';
import { menuKeys, useMenu } from '@/features/menu/menu.api';
import { PAYMENT_METHOD } from '@/features/orders/order-status';
import { orderKeys, ordersApi } from '@/features/orders/orders.api';
import { ProductImage } from '@/features/products/ProductImage';
import { getErrorMessage, isApiError } from '@/lib/api-error';
import { cn } from '@/lib/cn';
import { formatCurrency, pluralize } from '@/lib/format';
import type { CartIssue, PaymentMethod } from '@/types/api';

const METHODS: PaymentMethod[] = ['PIX', 'CASH', 'AT_COUNTER'];

export function CheckoutPage() {
  const cart = useCart();
  const menu = useMenu();
  const review = useCartReview(menu.data);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<PaymentMethod>('PIX');
  const [notes, setNotes] = useState('');
  const [serverIssues, setServerIssues] = useState<CartIssue[]>([]);
  // Uma chave por intenção de compra: reenvios (clique duplo, rede instável) não duplicam o pedido.
  const idempotencyKey = useRef(crypto.randomUUID());

  const placeOrder = useMutation({
    mutationFn: () =>
      ordersApi.create(
        {
          items: cart.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
          paymentMethod: method,
          notes: notes.trim() || undefined,
        },
        idempotencyKey.current,
      ),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
      void queryClient.invalidateQueries({ queryKey: menuKeys.all });
      idempotencyKey.current = crypto.randomUUID();
      cart.clear();
      void navigate(`/aluno/pedidos/${order.id}?novo=1`, { replace: true });
    },
    onError: (error) => {
      if (isApiError(error) && error.code === 'CART_UNAVAILABLE') {
        const details = error.details as { issues?: CartIssue[] } | undefined;
        setServerIssues(details?.issues ?? []);
        void menu.refetch();
      }
      toast.error(getErrorMessage(error));
    },
  });

  const fixCart = () => {
    for (const line of review.lines) {
      if (line.issue === 'unavailable' || line.issue === 'out_of_stock') cart.remove(line.productId);
      else if (line.issue === 'insufficient_stock' && line.product) cart.setQuantity(line.productId, line.product.stock);
    }
    for (const issue of serverIssues) {
      if (issue.available > 0) cart.setQuantity(issue.productId, issue.available);
      else cart.remove(issue.productId);
    }
    setServerIssues([]);
    toast.success('Carrinho ajustado ao estoque disponível.');
  };

  if (cart.count === 0) {
    return (
      <>
        <PageTitle title="Finalizar pedido" />
        <Card>
          <EmptyState
            icon={<ShoppingBag />}
            title="Seu carrinho está vazio"
            description="Adicione itens do cardápio para finalizar um pedido."
            action={<ButtonLink to="/aluno">Ver cardápio</ButtonLink>}
          />
        </Card>
      </>
    );
  }

  const hasIssues = review.hasIssues || serverIssues.length > 0;

  return (
    <>
      <PageTitle title="Finalizar pedido" />
      <Link to="/aluno" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="size-4" aria-hidden />
        Continuar comprando
      </Link>
      <h1 className="text-[28px] font-semibold tracking-tight text-ink-950">Finalizar pedido</h1>
      <p className="mt-1 text-[15px] text-ink-500">Revise os itens, escolha como pagar e confirme.</p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          {hasIssues && (
            <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
              <TriangleAlert className="size-5 shrink-0 text-amber-600" aria-hidden />
              <p className="flex-1 text-sm text-amber-900">
                Alguns itens mudaram desde que você os adicionou. Ajuste o carrinho para continuar.
              </p>
              <Button size="sm" variant="secondary" leftIcon={<Wand2 />} onClick={fixCart}>
                Ajustar automaticamente
              </Button>
            </div>
          )}

          <Card>
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-ink-950">Seu pedido</h2>
              <span className="text-[13px] text-ink-500">{pluralize(cart.count, 'item', 'itens')}</span>
            </div>
            <ul className="divide-y divide-ink-100">
              {review.lines.map((line) => {
                const serverIssue = serverIssues.find((issue) => issue.productId === line.productId);
                const message = issueMessage(line) ?? (serverIssue ? `Disponível agora: ${serverIssue.available} unidade(s).` : null);
                return (
                  <li key={line.productId} className={cn('flex gap-4 px-5 py-4', message && 'bg-amber-50/40')}>
                    <div className="size-16 shrink-0 overflow-hidden rounded-xl ring-1 ring-ink-200/70">
                      <ProductImage src={line.imageUrl} name={line.name} categorySlug={line.categorySlug} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-ink-900">{line.name}</p>
                          <p className="text-xs text-ink-500 tabular-nums">{formatCurrency(line.price)} cada</p>
                        </div>
                        <p className="text-sm font-semibold text-ink-900 tabular-nums">{formatCurrency(line.price * line.quantity)}</p>
                      </div>
                      {message && <p className="mt-1.5 text-xs font-medium text-amber-700">{message}</p>}
                      <div className="mt-3">
                        <QuantityStepper
                          size="sm"
                          value={line.quantity}
                          max={line.maxQuantity}
                          removable
                          onChange={(quantity) => {
                            setServerIssues((issues) => issues.filter((issue) => issue.productId !== line.productId));
                            cart.setQuantity(line.productId, quantity);
                          }}
                          label={`Quantidade de ${line.name}`}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="p-5">
            <Field
              label="Observações para a cantina"
              htmlFor="notes"
              hint="Opcional. Ex.: sem cebola, retirar no segundo intervalo."
              aside={<span className="text-xs text-ink-400 tabular-nums">{notes.length}/200</span>}
            >
              <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={200} rows={2} />
            </Field>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24">
          <Card className="p-5">
            <fieldset>
              <legend className="text-[15px] font-semibold text-ink-950">Forma de pagamento</legend>
              <p className="mt-0.5 text-[13px] text-ink-500">O pagamento é feito na retirada, no balcão.</p>
              <div className="mt-4 space-y-2.5">
                {METHODS.map((value) => {
                  const config = PAYMENT_METHOD[value];
                  const Icon = config.icon;
                  const selected = method === value;
                  return (
                    <label
                      key={value}
                      className={cn(
                        'flex cursor-pointer items-center gap-3.5 rounded-xl border p-3.5 transition-all',
                        selected ? 'border-brand-500 bg-brand-50/60 ring-4 ring-brand-500/10' : 'border-ink-200 hover:border-ink-300',
                      )}
                    >
                      <input
                        type="radio"
                        name="payment-method"
                        value={value}
                        checked={selected}
                        onChange={() => setMethod(value)}
                        className="sr-only"
                      />
                      <span
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-lg',
                          selected ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500',
                        )}
                      >
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink-900">{config.label}</span>
                        <span className="block text-xs text-ink-500">{config.description}</span>
                      </span>
                      <span
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                          selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300',
                        )}
                        aria-hidden
                      >
                        {selected && <Check className="size-3" strokeWidth={3} />}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </Card>

          <Card className="p-5">
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between text-ink-600">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatCurrency(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-ink-600">
                <dt>Taxa de serviço</dt>
                <dd className="text-brand-700">Grátis</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-ink-100 pt-3">
                <dt className="font-medium text-ink-900">Total</dt>
                <dd className="text-2xl font-semibold tracking-tight text-ink-950">{formatCurrency(cart.subtotal)}</dd>
              </div>
            </dl>
            <Button
              size="lg"
              className="mt-5 w-full"
              onClick={() => placeOrder.mutate()}
              loading={placeOrder.isPending}
              disabled={hasIssues}
            >
              Confirmar pedido
            </Button>
            <p className="mt-3 flex items-start gap-2 text-xs text-ink-500">
              <Info className="mt-px size-3.5 shrink-0" aria-hidden />
              Preços e disponibilidade são confirmados no momento do pedido.
            </p>
            <p className="mt-2 flex items-start gap-2 text-xs text-ink-500">
              <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden />
              Você pode cancelar enquanto o pedido não entrar em preparo.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
