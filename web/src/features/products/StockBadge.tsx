import { Badge } from '@/components/ui/Badge';

export const LOW_STOCK_THRESHOLD = 5;

export function StockBadge({ stock, isAvailable = true }: { stock: number; isAvailable?: boolean }) {
  if (!isAvailable) return <Badge tone="neutral">Oculto</Badge>;
  if (stock === 0) return <Badge tone="danger" dot>Esgotado</Badge>;
  if (stock <= LOW_STOCK_THRESHOLD) return <Badge tone="warning" dot>Estoque baixo</Badge>;
  return <Badge tone="success" dot>Disponível</Badge>;
}
