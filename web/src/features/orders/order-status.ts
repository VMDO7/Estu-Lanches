import { Ban, Banknote, ChefHat, CircleCheck, Inbox, PackageCheck, QrCode, Store, type LucideIcon } from 'lucide-react';
import type { BadgeTone } from '@/components/ui/Badge';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/types/api';

interface StatusConfig {
  label: string;
  short: string;
  tone: BadgeTone;
  icon: LucideIcon;
  /** Mensagem exibida ao estudante. */
  description: string;
}

export const ORDER_STATUS: Record<OrderStatus, StatusConfig> = {
  RECEIVED: {
    label: 'Recebido',
    short: 'Recebido',
    tone: 'info',
    icon: Inbox,
    description: 'A cantina recebeu seu pedido e logo começa o preparo.',
  },
  PREPARING: {
    label: 'Em preparação',
    short: 'Preparando',
    tone: 'warning',
    icon: ChefHat,
    description: 'Seu pedido está sendo preparado agora.',
  },
  READY: {
    label: 'Pronto para retirada',
    short: 'Pronto',
    tone: 'success',
    icon: PackageCheck,
    description: 'Pode buscar! Apresente o código no balcão.',
  },
  DELIVERED: {
    label: 'Entregue',
    short: 'Entregue',
    tone: 'neutral',
    icon: CircleCheck,
    description: 'Pedido retirado. Bom apetite!',
  },
  CANCELLED: {
    label: 'Cancelado',
    short: 'Cancelado',
    tone: 'danger',
    icon: Ban,
    description: 'Este pedido foi cancelado.',
  },
};

/** Etapas do fluxo feliz, na ordem. */
export const ORDER_FLOW: OrderStatus[] = ['RECEIVED', 'PREPARING', 'READY', 'DELIVERED'];
export const ACTIVE_STATUSES: OrderStatus[] = ['RECEIVED', 'PREPARING', 'READY'];

/** Próxima ação da cantina para cada etapa (espelha a máquina de estados da API). */
export const NEXT_ACTION: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  RECEIVED: { status: 'PREPARING', label: 'Iniciar preparo' },
  PREPARING: { status: 'READY', label: 'Marcar como pronto' },
  READY: { status: 'DELIVERED', label: 'Confirmar entrega' },
};

export const PAYMENT_METHOD: Record<PaymentMethod, { label: string; icon: LucideIcon; description: string }> = {
  PIX: { label: 'PIX', icon: QrCode, description: 'Pague com PIX no balcão, na retirada.' },
  CASH: { label: 'Dinheiro', icon: Banknote, description: 'Pague em espécie na retirada.' },
  AT_COUNTER: { label: 'Pagamento na cantina', icon: Store, description: 'Cartão ou outra forma aceita no balcão.' },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'Pagamento pendente', tone: 'warning' },
  PAID: { label: 'Pago', tone: 'success' },
  REFUNDED: { label: 'Estornado', tone: 'neutral' },
  CANCELLED: { label: 'Pagamento cancelado', tone: 'neutral' },
};

export const isActiveStatus = (status: OrderStatus) => ACTIVE_STATUSES.includes(status);
