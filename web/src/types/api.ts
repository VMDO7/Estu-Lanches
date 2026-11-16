/** Contratos da API REST (espelham os DTOs do backend). */

export type Role = 'ADMIN' | 'STUDENT';
export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'PIX' | 'AT_COUNTER';
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'CANCELLED';

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface DataResponse<T> {
  data: T;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  student: { id: string; registration: string; grade: string } | null;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  expiresIn: number;
}

export interface AppMeta {
  name: string;
  demoMode: boolean;
  timezone: string;
  lowStockThreshold: number;
  maxItemQuantity: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  isAvailable: boolean;
  imageKey: string | null;
  imageUrl: string | null;
  category: { id: string; name: string; slug: string };
  createdAt: string;
  updatedAt: string;
}

export interface MenuProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  categoryId: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  products: MenuProduct[];
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  imageUrl: string | null;
  categorySlug: string;
}

export interface OrderStatusEntry {
  id: string;
  status: OrderStatus;
  note: string | null;
  createdAt: string;
  changedBy: { name: string; role: Role } | null;
}

export interface Order {
  id: string;
  code: string;
  status: OrderStatus;
  total: number;
  notes: string | null;
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
  student: { id: string; name: string; email: string; registration: string; grade: string };
  items: OrderItem[];
  payment: { method: PaymentMethod; status: PaymentStatus; amount: number; paidAt: string | null } | null;
  statusHistory?: OrderStatusEntry[];
}

export interface CartIssue {
  productId: string;
  name: string | null;
  reason: 'NOT_FOUND' | 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK';
  available: number;
  requested: number;
}

export interface Student {
  id: string;
  userId: string;
  name: string;
  email: string;
  registration: string;
  grade: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

export interface StudentDetail extends Student {
  averageTicket: number;
  cancelledCount: number;
  favoriteProducts: Array<{ productId: string; name: string; quantity: number }>;
}

export interface DashboardSummary {
  today: { revenue: number; orders: number; cancelled: number; averageTicket: number };
  yesterday: { revenue: number; orders: number };
  pendingOrders: { total: number; byStatus: Record<'RECEIVED' | 'PREPARING' | 'READY', number> };
  products: { total: number; available: number; outOfStock: number; lowStock: number };
  activeStudents: number;
  lowStockProducts: Array<{
    id: string;
    name: string;
    stock: number;
    isAvailable: boolean;
    imageUrl: string | null;
    category: { name: string; slug: string };
  }>;
  lowStockThreshold: number;
}

export interface SalesPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
  imageUrl: string | null;
}

export interface HourPoint {
  hour: number;
  orders: number;
  revenue: number;
}
