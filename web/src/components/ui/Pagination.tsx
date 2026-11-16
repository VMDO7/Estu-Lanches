import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  noun?: string;
}

export function Pagination({ page, totalPages, total, pageSize, onPageChange, noun = 'registros' }: PaginationProps) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav className="flex items-center justify-between gap-4 px-5 py-3.5" aria-label="Paginação">
      <p className="text-[13px] text-ink-500">
        <span className="font-medium text-ink-700 tabular-nums">
          {formatNumber(from)}–{formatNumber(to)}
        </span>{' '}
        de <span className="font-medium text-ink-700 tabular-nums">{formatNumber(total)}</span> {noun}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft />
        </Button>
        <span className="min-w-16 text-center text-[13px] text-ink-600 tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Próxima página"
        >
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
