import { ChartColumn, Table2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { cn } from '@/lib/cn';

export interface ChartTable {
  caption: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}

interface ChartCardProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  /** Gêmeo acessível do gráfico (todos os valores legíveis sem hover). */
  table?: ChartTable;
  loading?: boolean;
  /** Refetch em andamento: mantém o gráfico anterior com opacidade reduzida. */
  fetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  height?: number;
  children: ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  description,
  actions,
  icon,
  table,
  loading,
  fetching,
  error,
  onRetry,
  height = 260,
  children,
  className,
}: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={title}
        description={description}
        icon={icon}
        actions={
          <>
            {actions}
            {table && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowTable((value) => !value)}
                aria-pressed={showTable}
                aria-label={showTable ? 'Ver gráfico' : 'Ver dados em tabela'}
                title={showTable ? 'Ver gráfico' : 'Ver dados em tabela'}
              >
                {showTable ? <ChartColumn /> : <Table2 />}
              </Button>
            )}
          </>
        }
      />
      <div className="flex-1 px-5 pt-4 pb-5">
        {error ? (
          <ErrorState error={error} onRetry={onRetry} className="py-8" />
        ) : loading ? (
          <div style={{ height }}>
            <Skeleton className="size-full rounded-xl" />
          </div>
        ) : showTable && table ? (
          <div className="overflow-auto rounded-xl border border-ink-100" style={{ maxHeight: height }}>
            <table className="w-full text-left text-[13px]">
              <caption className="sr-only">{table.caption}</caption>
              <thead className="sticky top-0 bg-ink-25">
                <tr>
                  {table.columns.map((column) => (
                    <th key={column} scope="col" className="px-3 py-2 font-semibold text-ink-600">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {table.rows.map((row, index) => (
                  <tr key={index}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-3 py-1.5 text-ink-700 tabular-nums">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={cn('transition-opacity duration-300', fetching && 'opacity-50')} style={{ height }}>
            {children}
          </div>
        )}
      </div>
    </Card>
  );
}

/** Conteúdo padrão de tooltip: valor em destaque, rótulo secundário, chave em linha. */
export function TooltipBox({ title, rows }: { title: string; rows: Array<{ label: string; value: string; color?: string }> }) {
  return (
    <div className="min-w-40 rounded-xl border border-ink-200/80 bg-white/95 px-3.5 py-2.5 shadow-elevated backdrop-blur">
      <p className="mb-1.5 text-xs font-medium text-ink-500">{title}</p>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2">
            {row.color && <span className="h-0.5 w-3 rounded-full" style={{ background: row.color }} aria-hidden />}
            <span className="text-sm font-semibold text-ink-950 tabular-nums">{row.value}</span>
            <span className="text-xs text-ink-500">{row.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
