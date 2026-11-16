import { ChevronRight, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { PageHeader, PageTitle } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/Table';
import { useStudents, type StudentListParams } from '@/features/students/students.api';
import { cn } from '@/lib/cn';
import { formatCurrency, formatNumber, formatRelative, pluralize } from '@/lib/format';
import { useDebouncedValue } from '@/lib/hooks';

export function StudentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<NonNullable<StudentListParams['status']>>('all');
  const [sort, setSort] = useState<NonNullable<StudentListParams['sort']>>('name');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim());

  const students = useStudents({ search: debouncedSearch || undefined, status, sort, page, pageSize: 15 });

  return (
    <>
      <PageTitle title="Estudantes" />
      <PageHeader
        title="Estudantes"
        description={
          students.data
            ? `${pluralize(students.data.meta.total, 'estudante cadastrado', 'estudantes cadastrados')}${status !== 'all' ? ' neste filtro' : ''}.`
            : 'Contas de estudantes, histórico e informações básicas.'
        }
      />

      <Card>
        <div className="flex flex-col gap-2 border-b border-ink-100 p-4 sm:flex-row">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Nome, e-mail, matrícula ou turma"
            className="sm:max-w-sm"
          />
          <div className="grid flex-1 grid-cols-2 gap-2 sm:flex sm:justify-end">
            <Select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as typeof status);
                setPage(1);
              }}
              aria-label="Situação da conta"
              className="sm:w-40"
            >
              <option value="all">Todas as contas</option>
              <option value="active">Ativas</option>
              <option value="inactive">Desativadas</option>
            </Select>
            <Select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="Ordenação" className="sm:w-44">
              <option value="name">Nome (A–Z)</option>
              <option value="recent">Cadastro mais recente</option>
            </Select>
          </div>
        </div>

        {students.error ? (
          <ErrorState error={students.error} onRetry={() => void students.refetch()} />
        ) : students.isLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4].map((key) => (
              <Skeleton key={key} className="h-12" />
            ))}
          </div>
        ) : students.data && students.data.data.length > 0 ? (
          <div className={cn('transition-opacity', students.isPlaceholderData && 'opacity-60')}>
            <Table>
              <THead>
                <TR>
                  <TH>Estudante</TH>
                  <TH className="hidden md:table-cell">Matrícula</TH>
                  <TH className="hidden sm:table-cell">Turma</TH>
                  <TH className="text-right">Pedidos</TH>
                  <TH className="hidden text-right lg:table-cell">Total gasto</TH>
                  <TH className="hidden xl:table-cell">Último pedido</TH>
                  <TH className="hidden md:table-cell">Situação</TH>
                  <TH>
                    <span className="sr-only">Abrir</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {students.data.data.map((student) => (
                  <TR
                    key={student.id}
                    className="cursor-pointer hover:bg-ink-25"
                    onClick={() => void navigate(`/admin/estudantes/${student.id}`)}
                  >
                    <TD>
                      <div className="flex items-center gap-3">
                        <Avatar name={student.name} size="sm" />
                        <div className="min-w-0">
                          <Link
                            to={`/admin/estudantes/${student.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className="block truncate font-medium text-ink-900 hover:text-brand-700"
                          >
                            {student.name}
                          </Link>
                          <p className="truncate text-xs text-ink-500">{student.email}</p>
                        </div>
                      </div>
                    </TD>
                    <TD className="hidden font-mono text-[13px] md:table-cell">{student.registration}</TD>
                    <TD className="hidden sm:table-cell">{student.grade}</TD>
                    <TD className="text-right font-medium tabular-nums">{formatNumber(student.ordersCount)}</TD>
                    <TD className="hidden text-right font-medium tabular-nums lg:table-cell">{formatCurrency(student.totalSpent)}</TD>
                    <TD className="hidden text-[13px] text-ink-500 xl:table-cell">
                      {student.lastOrderAt ? formatRelative(student.lastOrderAt) : 'Nunca'}
                    </TD>
                    <TD className="hidden md:table-cell">
                      {student.isActive ? <Badge tone="success" dot>Ativa</Badge> : <Badge tone="danger" dot>Desativada</Badge>}
                    </TD>
                    <TD className="text-right">
                      <ChevronRight className="ml-auto size-4 text-ink-300" aria-hidden />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="border-t border-ink-100">
              <Pagination
                page={students.data.meta.page}
                totalPages={students.data.meta.totalPages}
                total={students.data.meta.total}
                pageSize={students.data.meta.pageSize}
                onPageChange={setPage}
                noun="estudantes"
              />
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<Users />}
            title="Nenhum estudante encontrado"
            description={debouncedSearch ? 'Tente buscar por outro termo.' : 'Os estudantes aparecem aqui quando criam suas contas.'}
          />
        )}
      </Card>
    </>
  );
}
