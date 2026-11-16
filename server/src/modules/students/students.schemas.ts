import { z } from 'zod';
import { paginationQuery } from '../../shared/pagination.js';
import { optionalSearch } from '../../shared/validation.js';

export const listStudentsQuery = paginationQuery.extend({
  search: optionalSearch,
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  sort: z.enum(['name', 'recent']).default('name'),
});

export const updateStudentStatusSchema = z.object({
  isActive: z.boolean({ error: 'Informe se o acesso está ativo.' }),
});

export type ListStudentsQuery = z.infer<typeof listStudentsQuery>;
