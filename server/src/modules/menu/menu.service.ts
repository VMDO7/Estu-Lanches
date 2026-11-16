import { prisma } from '../../lib/prisma.js';
import { imageUrlFor } from '../../lib/storage.js';
import { toMoney } from '../../shared/money.js';

export interface MenuProductDto {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  categoryId: string;
}

export interface MenuCategoryDto {
  id: string;
  name: string;
  slug: string;
  products: MenuProductDto[];
}

/**
 * Cardápio publicado para os estudantes: categorias ativas (na ordem definida
 * pela cantina) com produtos disponíveis. Itens sem estoque continuam visíveis
 * como "esgotados" — a validação definitiva acontece no checkout.
 *
 * Ponto natural para cache (Redis) com invalidação em alterações de catálogo.
 */
export const menuService = {
  async getMenu(): Promise<MenuCategoryDto[]> {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        products: {
          where: { archivedAt: null, isAvailable: true },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            stock: true,
            imageKey: true,
            categoryId: true,
          },
        },
      },
    });

    return categories
      .filter((category) => category.products.length > 0)
      .map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        products: category.products.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: toMoney(product.price),
          stock: product.stock,
          imageUrl: imageUrlFor(product.imageKey),
          categoryId: product.categoryId,
        })),
      }));
  },
};
