import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';

const withProductCount = {
  _count: { select: { products: { where: { archivedAt: null } } } },
} satisfies Prisma.CategoryInclude;

export type CategoryWithCount = Prisma.CategoryGetPayload<{ include: typeof withProductCount }>;

export const categoriesRepository = {
  list(includeInactive: boolean) {
    return prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: withProductCount,
    });
  },

  findById(id: string) {
    return prisma.category.findUnique({ where: { id }, include: withProductCount });
  },

  findConflicting(name: string, slug: string, excludeId?: string) {
    return prisma.category.findFirst({
      where: {
        OR: [{ name: { equals: name, mode: 'insensitive' } }, { slug }],
        ...(excludeId && { NOT: { id: excludeId } }),
      },
      select: { id: true },
    });
  },

  async nextSortOrder() {
    const { _max } = await prisma.category.aggregate({ _max: { sortOrder: true } });
    return (_max.sortOrder ?? -1) + 1;
  },

  create(data: Prisma.CategoryCreateInput) {
    return prisma.category.create({ data, include: withProductCount });
  },

  update(id: string, data: Prisma.CategoryUpdateInput) {
    return prisma.category.update({ where: { id }, data, include: withProductCount });
  },

  /** Conta inclusive produtos arquivados (eles mantêm a chave estrangeira). */
  countAllProducts(id: string) {
    return prisma.product.count({ where: { categoryId: id } });
  },

  delete(id: string) {
    return prisma.category.delete({ where: { id } });
  },

  async allIds() {
    const rows = await prisma.category.findMany({ select: { id: true } });
    return rows.map((row) => row.id);
  },

  reorder(orderedIds: string[]) {
    return prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.category.update({ where: { id }, data: { sortOrder: index }, select: { id: true } }),
      ),
    );
  },
};
