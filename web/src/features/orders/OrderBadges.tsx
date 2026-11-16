import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/types/api';
import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, isActiveStatus } from './order-status';

export function OrderStatusBadge({ status, size }: { status: OrderStatus; size?: 'sm' | 'md' }) {
  const config = ORDER_STATUS[status];
  const Icon = config.icon;
  return (
    <Badge tone={config.tone} size={size} icon={<Icon aria-hidden />} dot={false}>
      {config.label}
      {isActiveStatus(status) && <span className="sr-only"> (em andamento)</span>}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = PAYMENT_STATUS[status];
  return (
    <Badge tone={config.tone} dot>
      {config.label}
    </Badge>
  );
}

export function PaymentMethodLabel({ method, className }: { method: PaymentMethod; className?: string }) {
  const config = PAYMENT_METHOD[method];
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5', className ?? 'text-[13px] text-ink-600')}>
      <Icon className="size-3.5 shrink-0 text-ink-400" aria-hidden />
      {config.label}
    </span>
  );
}
