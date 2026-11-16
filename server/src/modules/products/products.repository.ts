import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { LOW_STOCK_THRESHOLD } from '../../shared/constants.js';
import { toSkipTake } from '../../shared/pagination.js';
import type { ListProductsQuery } from './products.schemas.js';

export const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductInclude;

export type ProductWithCategory = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function buildWhere(query: ListProductsQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { archivedAt: null };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  if (query.categoryId) {
    where.categoryId = query.categoryId;
  }

  switch (query.availability) {
    case 'available':
      where.isAvailable = true;
      where.stock = { gt: 0 };
      break;
    case 'unavailable':
      where.isAvailable = false;
      break;
    case 'out_of_stock':
      where.stock = 0;
      break;
    case 'low_stock':
      where.stock = { gt: 0, lte: LOW_STOCK_THRESHOLD };
      break;
  }

  return where;
}

export const productsRepository = {
  async list(query: ListProductsQuery) {
    const where = buildWhere(query);
    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: [{ [query.sort]: query.order }, { id: 'asc' }],
        ...toSkipTake(query),
      }),
      prisma.product.count({ where }),
    ]);
    return { items, total };
  },

  findActiveById(id: string) {
    return prisma.product.findFirst({ where: { id, archivedAt: null }, include: productInclude });
  },

  findDuplicateName(name: string, excludeId?: string) {
    return prisma.product.findFirst({
      where: {
        archivedAt: null,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId && { NOT: { id: excludeId } }),
      },
      select: { id: true },
    });
  },

  categoryExists(categoryId: string) {
    return prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  },

  create(data: Prisma.ProductUncheckedCreateInput) {
    return prisma.product.create({ data, include: productInclude });
  },

  update(id: string, data: Prisma.ProductUncheckedUpdateInput) {
    return prisma.product.update({ where: { id }, data, include: productInclude });
  },

  hardDelete(id: string) {
    return prisma.product.delete({ where: { id } });
  },

  archive(id: string) {
    return prisma.product.update({
      where: { id },
      data: { archivedAt: new Date(), isAvailable: false },
      select: { id: true },
    });
  },

  /**
   * Ajuste relativo e atômico: `stock = stock + delta` com a condição de não
   * ficar negativo avaliada na mesma instrução (sem corrida com vendas).
   */
  async adjustStock(id: string, delta: number): Promise<number | null> {
    const rows = await prisma.$queryRaw<Array<{ stock: number }>>`
      UPDATE products
         SET stock = stock + ${delta}::int, updated_at = NOW()
       WHERE id = ${id}::uuid
         AND archived_at IS NULL
         AND stock + ${delta}::int >= 0
   RETURNING stock`;
    return rows[0]?.stock ?? null;
  },
};
