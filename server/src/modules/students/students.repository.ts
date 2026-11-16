import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { toSkipTake } from '../../shared/pagination.js';
import type { ListStudentsQuery } from './students.schemas.js';

export const studentInclude = {
  user: {
    select: { id: true, name: true, email: true, isActive: true, lastLoginAt: true, createdAt: true },
  },
} satisfies Prisma.StudentInclude;

export type StudentWithUser = Prisma.StudentGetPayload<{ include: typeof studentInclude }>;

export const studentsRepository = {
  async list(query: ListStudentsQuery) {
    const where: Prisma.StudentWhereInput = {};

    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' as const };
      where.OR = [
        { registration: contains },
        { grade: contains },
        { user: { name: contains } },
        { user: { email: contains } },
      ];
    }
    if (query.status !== 'all') {
      where.user = { isActive: query.status === 'active' };
    }

    const [items, total] = await prisma.$transaction([
      prisma.student.findMany({
        where,
        include: studentInclude,
        orderBy: query.sort === 'name' ? [{ user: { name: 'asc' } }, { id: 'asc' }] : [{ createdAt: 'desc' }, { id: 'asc' }],
        ...toSkipTake(query),
      }),
      prisma.student.count({ where }),
    ]);
    return { items, total };
  },

  findById(id: string) {
    return prisma.student.findUnique({ where: { id }, include: studentInclude });
  },

  /** Agregados de pedidos (exceto cancelados) para um conjunto de estudantes. */
  aggregateOrders(studentIds: string[]) {
    return prisma.order.groupBy({
      by: ['studentId'],
      where: { studentId: { in: studentIds }, status: { not: 'CANCELLED' } },
      _count: { _all: true },
      _sum: { total: true },
      _max: { createdAt: true },
    });
  },

  countCancelled(studentId: string) {
    return prisma.order.count({ where: { studentId, status: 'CANCELLED' } });
  },

  favoriteProducts(studentId: string, limit = 3) {
    return prisma.$queryRaw<Array<{ productId: string; name: string; quantity: number }>>`
      SELECT p.id AS "productId", p.name, SUM(oi.quantity)::int AS quantity
        FROM order_items oi
        JOIN orders o   ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
       WHERE o.student_id = ${studentId}::uuid
         AND o.status <> 'CANCELLED'
    GROUP BY p.id, p.name
    ORDER BY quantity DESC, p.name ASC
       LIMIT ${limit}::int`;
  },

  setUserActive(userId: string, isActive: boolean) {
    return prisma.user.update({ where: { id: userId }, data: { isActive }, select: { id: true } });
  },
};
