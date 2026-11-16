import { use, useEffect, useMemo } from 'react';
import type { MenuCategory, MenuProduct } from '@/types/api';
import { CartContext, MAX_ITEM_QUANTITY, type CartLine } from './CartProvider';

export function useCart() {
  const context = use(CartContext);
  if (!context) throw new Error('useCart deve ser usado dentro de <CartProvider>.');
  return context;
}

export type MenuProductWithCategory = MenuProduct & { categorySlug: string };

export function indexMenu(categories: MenuCategory[] | undefined) {
  const index = new Map<string, MenuProductWithCategory>();
  for (const category of categories ?? []) {
    for (const product of category.products) {
      index.set(product.id, { ...product, categorySlug: category.slug });
    }
  }
  return index;
}

export type LineIssue = 'unavailable' | 'out_of_stock' | 'insufficient_stock' | null;

export interface ReviewedLine extends CartLine {
  product: MenuProductWithCategory | undefined;
  issue: LineIssue;
  maxQuantity: number;
}

/**
 * Cruza o carrinho com o cardápio atual: identifica itens indisponíveis ou
 * acima do estoque antes de o estudante tentar finalizar.
 */
export function useCartReview(categories: MenuCategory[] | undefined) {
  const { lines, syncWithMenu } = useCart();
  const index = useMemo(() => indexMenu(categories), [categories]);

  useEffect(() => {
    if (categories) syncWithMenu(index);
  }, [categories, index, syncWithMenu]);

  return useMemo(() => {
    const reviewed: ReviewedLine[] = lines.map((line) => {
      const product = index.get(line.productId);
      const stock = product?.stock ?? 0;
      let issue: LineIssue = null;
      if (categories && !product) issue = 'unavailable';
      else if (product && stock === 0) issue = 'out_of_stock';
      else if (product && line.quantity > stock) issue = 'insufficient_stock';
      // Sem cardápio carregado ainda, não limitamos; item fora do cardápio só pode diminuir.
      const maxQuantity = product ? Math.min(MAX_ITEM_QUANTITY, stock) : categories ? 0 : MAX_ITEM_QUANTITY;
      return { ...line, product, issue, maxQuantity };
    });
    return {
      lines: reviewed,
      hasIssues: reviewed.some((line) => line.issue !== null),
      index,
    };
  }, [lines, index, categories]);
}
