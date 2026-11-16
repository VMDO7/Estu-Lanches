import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { imageUrlFor } from '../../lib/storage.js';
import { LOW_STOCK_THRESHOLD } from '../../shared/constants.js';
import { startOfLocalDay } from '../../shared/time.js';
import { ACTIVE_ORDER_STATUSES } from '../orders/order-status.js';

interface TodayKpiRow {
  revenueToday: number;
  ordersToday: number;
  cancelledToday: number;
  revenueYesterday: number;
  ordersYesterday: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Indicadores calculados diretamente no PostgreSQL. Os limites de "hoje" usam
 * o fuso configurado (APP_TIMEZONE) e comparações por intervalo, que
 * aproveitam o índice em orders.created_at.
 *
 * Em escala, estes agregados são candidatos a cache curto (Redis, 30–60 s)
 * ou a tabelas de resumo atualizadas por jobs assíncronos.
 */
export const dashboardService = {
  async summary() {
    const tz = env.APP_TIMEZONE;

    const [kpiRows, pendingGroups, productTotals, lowStockProducts, activeStudents] = await Promise.all([
      prisma.$queryRaw<TodayKpiRow[]>`
        WITH bounds AS (
          SELECT (date_trunc('day', NOW() AT TIME ZONE ${tz}::text) AT TIME ZONE ${tz}::text) AS today_start
        )
        SELECT
          COALESCE(SUM(o.total) FILTER (WHERE o.created_at >= b.today_start AND o.status <> 'CANCELLED'), 0)::float8 AS "revenueToday",
          (COUNT(o.id) FILTER (WHERE o.created_at >= b.today_start AND o.status <> 'CANCELLED'))::int AS "ordersToday",
          (COUNT(o.id) FILTER (WHERE o.created_at >= b.today_start AND o.status = 'CANCELLED'))::int AS "cancelledToday",
          COALESCE(SUM(o.total) FILTER (WHERE o.created_at < NOW() - INTERVAL '1 day' AND o.status <> 'CANCELLED'), 0)::float8 AS "revenueYesterday",
          (COUNT(o.id) FILTER (WHERE o.created_at < NOW() - INTERVAL '1 day' AND o.status <> 'CANCELLED'))::int AS "ordersYesterday"
        FROM bounds b
        LEFT JOIN orders o ON o.created_at >= b.today_start - INTERVAL '1 day'
        GROUP BY b.today_start`,
      prisma.order.groupBy({
        by: ['status'],
        where: { status: { in: [...ACTIVE_ORDER_STATUSES] } },
        _count: { _all: true },
      }),
      Promise.all([
        prisma.product.count({ where: { archivedAt: null } }),
        prisma.product.count({
          where: { archivedAt: null, isAvailable: true, stock: { gt: 0 }, category: { isActive: true } },
        }),
        prisma.product.count({ where: { archivedAt: null, stock: 0 } }),
        prisma.product.count({ where: { archivedAt: null, stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } } }),
      ]),
      prisma.product.findMany({
        where: { archivedAt: null, stock: { lte: LOW_STOCK_THRESHOLD } },
        orderBy: [{ stock: 'asc' }, { name: 'asc' }],
        take: 6,
        select: {
          id: true,
          name: true,
          stock: true,
          isAvailable: true,
          imageKey: true,
          category: { select: { name: true, slug: true } },
        },
      }),
      prisma.student.count({ where: { user: { isActive: true } } }),
    ]);

    const kpi = kpiRows[0] ?? {
      revenueToday: 0,
      ordersToday: 0,
      cancelledToday: 0,
      revenueYesterday: 0,
      ordersYesterday: 0,
    };
    const pendingByStatus = Object.fromEntries(
      ACTIVE_ORDER_STATUSES.map((status) => [
        status,
        pendingGroups.find((group) => group.status === status)?._count._all ?? 0,
      ]),
    ) as Record<(typeof ACTIVE_ORDER_STATUSES)[number], number>;
    const [totalProducts, availableProducts, outOfStock, lowStock] = productTotals;

    return {
      today: {
        revenue: round2(kpi.revenueToday),
        orders: kpi.ordersToday,
        cancelled: kpi.cancelledToday,
        averageTicket: kpi.ordersToday > 0 ? round2(kpi.revenueToday / kpi.ordersToday) : 0,
      },
      /** Ontem até o mesmo horário — comparação justa ao longo do dia. */
      yesterday: {
        revenue: round2(kpi.revenueYesterday),
        orders: kpi.ordersYesterday,
      },
      pendingOrders: {
        total: Object.values(pendingByStatus).reduce((sum, count) => sum + count, 0),
        byStatus: pendingByStatus,
      },
      products: { total: totalProducts, available: availableProducts, outOfStock, lowStock },
      activeStudents,
      lowStockProducts: lowStockProducts.map((product) => ({
        id: product.id,
        name: product.name,
        stock: product.stock,
        isAvailable: product.isAvailable,
        imageUrl: imageUrlFor(product.imageKey),
        category: product.category,
      })),
      lowStockThreshold: LOW_STOCK_THRESHOLD,
    };
  },

  /** Série diária de faturamento e pedidos (dias sem venda aparecem zerados). */
  async salesSeries(days: number) {
    const tz = env.APP_TIMEZONE;
    const rows = await prisma.$queryRaw<Array<{ date: string; revenue: number; orders: number }>>`
      WITH days AS (
        SELECT generate_series(
          date_trunc('day', NOW() AT TIME ZONE ${tz}::text) - make_interval(days => ${days - 1}::int),
          date_trunc('day', NOW() AT TIME ZONE ${tz}::text),
          INTERVAL '1 day'
        ) AS day
      )
      SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
             COALESCE(SUM(o.total), 0)::float8 AS revenue,
             COUNT(o.id)::int AS orders
        FROM days d
   LEFT JOIN orders o
          ON o.created_at >= (d.day AT TIME ZONE ${tz}::text)
         AND o.created_at <  ((d.day + INTERVAL '1 day') AT TIME ZONE ${tz}::text)
         AND o.status <> 'CANCELLED'
    GROUP BY d.day
    ORDER BY d.day`;

    return rows.map((row) => ({ ...row, revenue: round2(row.revenue) }));
  },

  async topProducts(days: number, limit: number) {
    const since = startOfLocalDay(env.APP_TIMEZONE, days - 1);
    const rows = await prisma.$queryRaw<
      Array<{ productId: string; name: string; imageKey: string | null; quantity: number; revenue: number }>
    >`
      SELECT p.id AS "productId",
             p.name,
             p.image_key AS "imageKey",
             SUM(oi.quantity)::int AS quantity,
             SUM(oi.quantity * oi.unit_price)::float8 AS revenue
        FROM order_items oi
        JOIN orders o   ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
       WHERE o.status <> 'CANCELLED'
         AND o.created_at >= ${since}
    GROUP BY p.id, p.name, p.image_key
    ORDER BY quantity DESC, revenue DESC
       LIMIT ${limit}::int`;

    return rows.map(({ imageKey, ...row }) => ({
      ...row,
      revenue: round2(row.revenue),
      imageUrl: imageUrlFor(imageKey),
    }));
  },

  /** Distribuição de pedidos por hora do dia — revela os horários de pico. */
  async salesByHour(days: number) {
    const tz = env.APP_TIMEZONE;
    const since = startOfLocalDay(tz, days - 1);
    const rows = await prisma.$queryRaw<Array<{ hour: number; orders: number; revenue: number }>>`
      SELECT EXTRACT(HOUR FROM o.created_at AT TIME ZONE ${tz}::text)::int AS hour,
             COUNT(*)::int AS orders,
             COALESCE(SUM(o.total), 0)::float8 AS revenue
        FROM orders o
       WHERE o.status <> 'CANCELLED'
         AND o.created_at >= ${since}
    GROUP BY hour
    ORDER BY hour`;

    return rows.map((row) => ({ ...row, revenue: round2(row.revenue) }));
  },
};
