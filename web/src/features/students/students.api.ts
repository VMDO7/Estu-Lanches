import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/api-error';
import type { DataResponse, Paginated, Student, StudentDetail } from '@/types/api';

export interface StudentListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  sort?: 'name' | 'recent';
}

export const studentKeys = {
  list: (params: StudentListParams) => ['students', 'list', params] as const,
  detail: (id: string) => ['students', 'detail', id] as const,
};

export function useStudents(params: StudentListParams) {
  return useQuery({
    queryKey: studentKeys.list(params),
    queryFn: () => api.get<Paginated<Student>>('/students', { query: { ...params } }),
    placeholderData: keepPreviousData,
  });
}

export function useStudent(id: string | undefined) {
  return useQuery({
    queryKey: studentKeys.detail(id ?? ''),
    queryFn: async () => (await api.get<DataResponse<StudentDetail>>(`/students/${id}`)).data,
    enabled: !!id,
  });
}

export function useSetStudentActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      (await api.patch<DataResponse<StudentDetail>>(`/students/${id}/status`, { isActive })).data,
    onSuccess: async (student) => {
      queryClient.setQueryData(studentKeys.detail(student.id), student);
      await queryClient.invalidateQueries({ queryKey: ['students', 'list'] });
      toast.success(student.isActive ? 'Acesso do estudante reativado.' : 'Acesso desativado e sessões encerradas.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
