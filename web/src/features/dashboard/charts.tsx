import { useCallback } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency, formatCurrencyAxis, formatDayKey, formatNumber, pluralize } from '@/lib/format';
import type { HourPoint, SalesPoint } from '@/types/api';
import { TooltipBox } from './ChartCard';

/*
 * Especificação visual (guia de dataviz): uma série por gráfico na cor da
 * marca validada (#039855, contraste ≥ 3:1), barras ≤ 24px com cantos de 4px
 * na ponta, linha de 2px, área a 10%, grade em hairline sólida e recessiva,
 * textos sempre em tokens de tinta (nunca na cor da série).
 */
const SERIES = 'var(--color-chart-series)';
const MUTED = 'var(--color-chart-muted)';
const GRID = 'var(--color-chart-grid)';
const AXIS_TICK = { fill: 'var(--color-ink-400)', fontSize: 12 };

interface TooltipPayload<T> {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: T }>;
}

// ---------------------------------------------------------------------------
// Vendas da semana — colunas com ênfase no dia atual
// ---------------------------------------------------------------------------

function WeeklyTooltip({ active, payload }: TooltipPayload<SalesPoint>) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <TooltipBox
      title={formatDayKey(point.date, { weekday: 'long', day: '2-digit', month: 'short' })}
      rows={[
        { label: point.orders === 1 ? 'pedido' : 'pedidos', value: formatNumber(point.orders), color: SERIES },
        { label: 'faturamento', value: formatCurrency(point.revenue) },
      ]}
    />
  );
}

interface BarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  payload?: SalesPoint;
}

export function WeeklySalesChart({ data }: { data: SalesPoint[] }) {
  const today = data[data.length - 1]?.date;
  const chartData = data.map((point) => ({
    ...point,
    label: formatDayKey(point.date, { weekday: 'short' }).replace(/^\w/, (c) => c.toUpperCase()),
  }));

  // Barra desenhada sob medida: ênfase e rótulo direto apenas no dia atual.
  // (Identificado pela data — o índice do LabelList ignora barras zeradas.)
  const renderBar = useCallback(
    (props: unknown) => {
      const { x = 0, y = 0, width = 0, height = 0, payload } = props as BarShapeProps;
      const isToday = payload?.date === today;
      return (
        <g>
          <Rectangle x={x} y={y} width={width} height={height} radius={[4, 4, 0, 0]} fill={isToday ? SERIES : MUTED} />
          {isToday && payload && payload.orders > 0 && (
            <text x={x + width / 2} y={y - 8} textAnchor="middle" className="fill-ink-900 text-xs font-semibold">
              {payload.orders}
            </text>
          )}
        </g>
      );
    },
    [today],
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 24, right: 4, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--color-ink-200)' }} tick={AXIS_TICK} dy={6} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} width={44} />
        <Tooltip content={<WeeklyTooltip />} cursor={{ fill: 'var(--color-ink-50)' }} />
        <Bar dataKey="orders" maxBarSize={24} shape={renderBar} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Faturamento por período — área de série única com crosshair
// ---------------------------------------------------------------------------

function RevenueTooltip({ active, payload }: TooltipPayload<SalesPoint>) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <TooltipBox
      title={formatDayKey(point.date, { weekday: 'short', day: '2-digit', month: 'short' })}
      rows={[
        { label: 'faturamento', value: formatCurrency(point.revenue), color: SERIES },
        { label: point.orders === 1 ? 'pedido' : 'pedidos', value: formatNumber(point.orders) },
      ]}
    />
  );
}

export function RevenueChart({ data }: { data: SalesPoint[] }) {
  const chartData = data.map((point) => ({
    ...point,
    label: formatDayKey(point.date, { day: '2-digit', month: '2-digit' }),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#039855" stopOpacity={0.14} />
            <stop offset="100%" stopColor="#039855" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={{ stroke: 'var(--color-ink-200)' }}
          tick={AXIS_TICK}
          minTickGap={24}
          interval="preserveStartEnd"
          dy={6}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
          tickFormatter={(value: number) => formatCurrencyAxis(value)}
          width={64}
        />
        <Tooltip content={<RevenueTooltip />} cursor={{ stroke: 'var(--color-ink-300)', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={SERIES}
          strokeWidth={2}
          fill="url(#revenue-fill)"
          activeDot={{ r: 5, fill: SERIES, stroke: 'white', strokeWidth: 2 }}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Horários de pico — colunas por hora com destaque no pico
// ---------------------------------------------------------------------------

/** Preenche as horas sem pedidos entre a primeira e a última hora com venda. */
export function fillHours(data: HourPoint[]): HourPoint[] {
  if (data.length === 0) return [];
  const byHour = new Map(data.map((point) => [point.hour, point]));
  const first = Math.min(...data.map((point) => point.hour));
  const last = Math.max(...data.map((point) => point.hour));
  return Array.from({ length: last - first + 1 }, (_, i) => byHour.get(first + i) ?? { hour: first + i, orders: 0, revenue: 0 });
}

function HourTooltip({ active, payload }: TooltipPayload<HourPoint>) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <TooltipBox
      title={`Das ${point.hour}h às ${point.hour + 1}h`}
      rows={[
        { label: point.orders === 1 ? 'pedido' : 'pedidos', value: formatNumber(point.orders), color: SERIES },
        { label: 'faturamento', value: formatCurrency(point.revenue) },
      ]}
    />
  );
}

export function PeakHoursChart({ data }: { data: HourPoint[] }) {
  const peak = data.reduce((best, point) => (point.orders > best.orders ? point : best), data[0] ?? { hour: -1, orders: 0, revenue: 0 });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis
          dataKey="hour"
          tickLine={false}
          axisLine={{ stroke: 'var(--color-ink-200)' }}
          tick={AXIS_TICK}
          tickFormatter={(hour: number) => `${hour}h`}
          interval="preserveStartEnd"
          dy={6}
        />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} width={44} />
        <Tooltip content={<HourTooltip />} cursor={{ fill: 'var(--color-ink-50)' }} />
        <Bar dataKey="orders" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((point) => (
            <Cell key={point.hour} fill={point.hour === peak.hour ? SERIES : MUTED} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function describePeak(data: HourPoint[]) {
  if (data.length === 0) return undefined;
  const peak = data.reduce((best, point) => (point.orders > best.orders ? point : best));
  return `Pico das ${peak.hour}h às ${peak.hour + 1}h · ${pluralize(peak.orders, 'pedido', 'pedidos')}`;
}
