import { imageUrlFor } from '../../lib/storage.js';
import { toMoney } from '../../shared/money.js';
import type { ProductWithCategory } from './products.repository.js';

export interface ProductDto {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  isAvailable: boolean;
  imageKey: string | null;
  imageUrl: string | null;
  category: { id: string; name: string; slug: string };
  createdAt: Date;
  updatedAt: Date;
}

export function toProductDto(product: ProductWithCategory): ProductDto {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: toMoney(product.price),
    stock: product.stock,
    isAvailable: product.isAvailable,
    imageKey: product.imageKey,
    imageUrl: imageUrlFor(product.imageKey),
    category: product.category,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}
