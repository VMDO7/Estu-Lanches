import { notFound } from '../../shared/errors.js';
import { toMoney } from '../../shared/money.js';
import { paginate, type Paginated } from '../../shared/pagination.js';
import { authRepository } from '../auth/auth.repository.js';
import { studentsRepository, type StudentWithUser } from './students.repository.js';
import type { ListStudentsQuery } from './students.schemas.js';

export interface StudentDto {
  id: string;
  userId: string;
  name: string;
  email: string;
  registration: string;
  grade: string;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: Date | null;
}

export interface StudentDetailDto extends StudentDto {
  averageTicket: number;
  cancelledCount: number;
  favoriteProducts: Array<{ productId: string; name: string; quantity: number }>;
}

type OrderAggregate = Awaited<ReturnType<typeof studentsRepository.aggregateOrders>>[number];

function toStudentDto(student: StudentWithUser, stats?: OrderAggregate): StudentDto {
  return {
    id: student.id,
    userId: student.user.id,
    name: student.user.name,
    email: student.user.email,
    registration: student.registration,
    grade: student.grade,
    isActive: student.user.isActive,
    createdAt: student.user.createdAt,
    lastLoginAt: student.user.lastLoginAt,
    ordersCount: stats?._count._all ?? 0,
    totalSpent: stats?._sum.total ? toMoney(stats._sum.total) : 0,
    lastOrderAt: stats?._max.createdAt ?? null,
  };
}

async function getOrThrow(id: string) {
  const student = await studentsRepository.findById(id);
  if (!student) throw notFound('Estudante não encontrado.');
  return student;
}

export const studentsService = {
  async list(query: ListStudentsQuery): Promise<Paginated<StudentDto>> {
    const { items, total } = await studentsRepository.list(query);
    const aggregates = items.length ? await studentsRepository.aggregateOrders(items.map((s) => s.id)) : [];
    const statsById = new Map(aggregates.map((row) => [row.studentId, row]));
    return paginate(
      items.map((student) => toStudentDto(student, statsById.get(student.id))),
      total,
      query,
    );
  },

  async get(id: string): Promise<StudentDetailDto> {
    const student = await getOrThrow(id);
    const [[stats], cancelledCount, favoriteProducts] = await Promise.all([
      studentsRepository.aggregateOrders([id]),
      studentsRepository.countCancelled(id),
      studentsRepository.favoriteProducts(id),
    ]);

    const dto = toStudentDto(student, stats);
    return {
      ...dto,
      averageTicket: dto.ordersCount > 0 ? Math.round((dto.totalSpent / dto.ordersCount) * 100) / 100 : 0,
      cancelledCount,
      favoriteProducts,
    };
  },

  /** Desativar encerra imediatamente todas as sessões (refresh tokens) do estudante. */
  async setActive(id: string, isActive: boolean): Promise<StudentDetailDto> {
    const student = await getOrThrow(id);
    await studentsRepository.setUserActive(student.user.id, isActive);
    if (!isActive) {
      await authRepository.revokeAllForUser(student.user.id);
    }
    return this.get(id);
  },
};
