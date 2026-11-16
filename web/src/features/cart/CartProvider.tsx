import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { safeStorage } from '@/lib/storage';
import type { MenuProduct } from '@/types/api';
import { useAuth } from '../auth/useAuth';

/** Quantidade máxima por item (espelha a regra da API). */
export const MAX_ITEM_QUANTITY = 20;

export interface CartLine {
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  categorySlug: string;
  quantity: number;
}

export interface CartProductInput {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  categorySlug: string;
}

export interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  /** Incrementa a cada adição (anima o ícone do carrinho). */
  bump: number;
  open: () => void;
  close: () => void;
  add: (product: CartProductInput, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  /** Atualiza nome/preço/imagem com os dados mais recentes do cardápio. */
  syncWithMenu: (products: Map<string, MenuProduct & { categorySlug: string }>) => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

function isCartLine(value: unknown): value is CartLine {
  const line = value as CartLine;
  return (
    typeof line?.productId === 'string' &&
    typeof line.name === 'string' &&
    typeof line.price === 'number' &&
    Number.isInteger(line.quantity) &&
    line.quantity > 0
  );
}

function loadLines(key: string | null): CartLine[] {
  if (!key) return [];
  const stored = safeStorage.get<unknown>(key, []);
  return Array.isArray(stored) ? stored.filter(isCartLine).slice(0, 30) : [];
}

/**
 * Carrinho por usuário, persistido localmente (conveniência — o servidor
 * revalida preços, disponibilidade e estoque no checkout).
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const storageKey = user?.role === 'STUDENT' ? `estulanches:cart:${user.id}` : null;

  const [cart, setCart] = useState(() => ({ key: storageKey, lines: loadLines(storageKey) }));
  const [isOpen, setIsOpen] = useState(false);
  const [bump, setBump] = useState(0);

  // Troca de usuário: recarrega o carrinho correspondente (estado derivado).
  if (cart.key !== storageKey) {
    setCart({ key: storageKey, lines: loadLines(storageKey) });
  }

  useEffect(() => {
    if (cart.key) safeStorage.set(cart.key, cart.lines);
  }, [cart]);

  // Mantém abas sincronizadas.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (storageKey && event.key === storageKey) {
        setCart({ key: storageKey, lines: loadLines(storageKey) });
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [storageKey]);

  const updateLines = useCallback((updater: (lines: CartLine[]) => CartLine[]) => {
    setCart((current) => ({ ...current, lines: updater(current.lines) }));
  }, []);

  const add = useCallback(
    (product: CartProductInput, quantity = 1) => {
      updateLines((lines) => {
        const existing = lines.find((line) => line.productId === product.id);
        if (existing) {
          return lines.map((line) =>
            line.productId === product.id
              ? { ...line, quantity: Math.min(MAX_ITEM_QUANTITY, line.quantity + quantity) }
              : line,
          );
        }
        return [
          ...lines,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
            categorySlug: product.categorySlug,
            quantity: Math.min(MAX_ITEM_QUANTITY, quantity),
          },
        ];
      });
      setBump((value) => value + 1);
    },
    [updateLines],
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      updateLines((lines) =>
        quantity <= 0
          ? lines.filter((line) => line.productId !== productId)
          : lines.map((line) =>
              line.productId === productId ? { ...line, quantity: Math.min(MAX_ITEM_QUANTITY, quantity) } : line,
            ),
      );
    },
    [updateLines],
  );

  const remove = useCallback(
    (productId: string) => updateLines((lines) => lines.filter((line) => line.productId !== productId)),
    [updateLines],
  );

  const clear = useCallback(() => updateLines(() => []), [updateLines]);

  const syncWithMenu = useCallback<CartContextValue['syncWithMenu']>(
    (products) => {
      updateLines((lines) => {
        let changed = false;
        const next = lines.map((line) => {
          const product = products.get(line.productId);
          if (!product) return line;
          if (product.price === line.price && product.name === line.name && product.imageUrl === line.imageUrl) {
            return line;
          }
          changed = true;
          return { ...line, name: product.name, price: product.price, imageUrl: product.imageUrl, categorySlug: product.categorySlug };
        });
        return changed ? next : lines;
      });
    },
    [updateLines],
  );

  const value = useMemo<CartContextValue>(() => {
    const count = cart.lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = Math.round(cart.lines.reduce((sum, line) => sum + line.price * line.quantity, 0) * 100) / 100;
    return {
      lines: cart.lines,
      count,
      subtotal,
      isOpen,
      bump,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      add,
      setQuantity,
      remove,
      clear,
      syncWithMenu,
    };
  }, [cart.lines, isOpen, bump, add, setQuantity, remove, clear, syncWithMenu]);

  return <CartContext value={value}>{children}</CartContext>;
}
