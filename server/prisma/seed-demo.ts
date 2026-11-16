/**
 * ============================================================================
 *  DADOS DE DEMONSTRAÇÃO — NÃO SÃO DADOS REAIS
 * ============================================================================
 * Popula um banco vazio com catálogo, estudantes e histórico de pedidos
 * fictícios para apresentar e testar o sistema. Todas as contas usam o
 * domínio reservado ".test" e a interface exibe o selo "Ambiente de
 * demonstração" quando DEMO_MODE=true.
 *
 * Uso:   npm run db:seed:demo            (somente em banco sem catálogo)
 *        npm run db:seed:demo -- --reset (apaga pedidos, produtos e estudantes)
 * Bloqueado quando NODE_ENV=production.
 */
import { randomUUID } from 'node:crypto';
import { env } from '../src/config/env.js';
import { Prisma } from '../src/generated/prisma/client.js';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '../src/generated/prisma/enums.js';
import { hashPassword } from '../src/lib/password.js';
import { prisma } from '../src/lib/prisma.js';
import { passwordField } from '../src/modules/auth/auth.schemas.js';
import { generateOrderCode } from '../src/modules/orders/order-code.js';
import { startOfLocalDay } from '../src/shared/time.js';
import { seedBase } from './seeds/base.js';

const HISTORY_DAYS = 45;
const DEMO_EMAIL_DOMAIN = 'estulanches.test';

// --- Gerador pseudoaleatório com semente fixa (dados reproduzíveis) ----------
let seed = 20_26_11;
function random() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randomInt = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;
function weightedPick<T>(entries: ReadonlyArray<readonly [T, number]>): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1]![0];
}

// --- Catálogo de demonstração ------------------------------------------------
interface DemoProduct {
  category: string;
  name: string;
  description: string;
  price: number;
  /** Preço praticado antes de um reajuste (demonstra o histórico de preços). */
  previousPrice?: number;
  stock: number;
  isAvailable?: boolean;
  popularity: number;
}

const PRODUCTS: DemoProduct[] = [
  { category: 'salgados', name: 'Coxinha de frango', description: 'Massa crocante recheada com frango desfiado e temperado.', price: 6.5, previousPrice: 6, stock: 40, popularity: 10 },
  { category: 'salgados', name: 'Pão de queijo (3 un.)', description: 'Porção com três pães de queijo mineiros, sempre quentinhos.', price: 5, stock: 60, popularity: 9 },
  { category: 'salgados', name: 'Esfiha de carne', description: 'Massa leve e macia com recheio de carne temperada.', price: 6, stock: 30, popularity: 6 },
  { category: 'salgados', name: 'Pastel assado de queijo', description: 'Pastel assado com recheio cremoso de muçarela.', price: 7, stock: 25, popularity: 5 },
  { category: 'salgados', name: 'Enroladinho de salsicha', description: 'Massa folhada dourada envolvendo salsicha.', price: 5.5, stock: 4, popularity: 5 },
  { category: 'salgados', name: 'Kibe', description: 'Kibe assado com trigo e carne, temperado com hortelã.', price: 6, stock: 0, popularity: 3 },
  { category: 'doces', name: 'Brigadeiro gourmet', description: 'Brigadeiro de chocolate belga com granulado.', price: 3.5, stock: 50, popularity: 7 },
  { category: 'doces', name: 'Bolo de cenoura (fatia)', description: 'Fatia generosa com cobertura de chocolate.', price: 6, previousPrice: 5.5, stock: 16, popularity: 6 },
  { category: 'doces', name: 'Brownie', description: 'Brownie de chocolate meio amargo com casquinha crocante.', price: 7.5, stock: 12, popularity: 5 },
  { category: 'doces', name: 'Cookie com gotas de chocolate', description: 'Cookie amanteigado com gotas de chocolate.', price: 5, stock: 3, popularity: 4 },
  { category: 'bebidas', name: 'Suco natural de laranja (300 ml)', description: 'Feito na hora, sem adição de açúcar.', price: 6, stock: 30, popularity: 7 },
  { category: 'bebidas', name: 'Água mineral (500 ml)', description: 'Água mineral sem gás.', price: 3, stock: 80, popularity: 6 },
  { category: 'bebidas', name: 'Refrigerante lata (350 ml)', description: 'Sabores variados — consulte no balcão.', price: 5.5, previousPrice: 5, stock: 48, popularity: 7 },
  { category: 'bebidas', name: 'Achocolatado (200 ml)', description: 'Bebida láctea sabor chocolate, gelada.', price: 4, stock: 36, popularity: 5 },
  { category: 'bebidas', name: 'Chá gelado de pêssego', description: 'Chá preto gelado com pêssego.', price: 5, stock: 20, isAvailable: false, popularity: 2 },
  { category: 'lanches', name: 'Misto quente', description: 'Pão de forma, presunto e queijo na chapa.', price: 8, stock: 25, popularity: 8 },
  { category: 'lanches', name: 'Sanduíche natural de frango', description: 'Pão integral, frango, cenoura, alface e requeijão.', price: 10, stock: 15, popularity: 5 },
  { category: 'lanches', name: 'X-salada', description: 'Hambúrguer, queijo, alface e tomate no pão brioche.', price: 14, stock: 12, popularity: 4 },
  { category: 'lanches', name: 'Wrap de frango', description: 'Tortilha com frango grelhado, folhas e molho de iogurte.', price: 12.5, stock: 10, popularity: 3 },
  { category: 'outros', name: 'Salada de frutas (copo)', description: 'Frutas da estação picadas na hora.', price: 7, stock: 14, popularity: 4 },
  { category: 'outros', name: 'Pipoca doce', description: 'Saquinho de pipoca caramelizada.', price: 4, stock: 20, popularity: 3 },
  { category: 'outros', name: 'Iogurte com granola', description: 'Iogurte natural com granola e mel.', price: 8.5, stock: 9, popularity: 3 },
];

const STUDENTS = [
  ['Ana Clara Souza', '1º ano A'],
  ['Bruno Henrique Lima', '1º ano A'],
  ['Carolina Mendes', '1º ano B'],
  ['Davi Oliveira Santos', '2º ano A'],
  ['Eduarda Ribeiro', '2º ano A'],
  ['Felipe Araújo', '2º ano B'],
  ['Gabriela Costa', '2º ano B'],
  ['Heitor Almeida', '3º ano A'],
  ['Isabela Ferreira', '3º ano A'],
  ['João Pedro Martins', '3º ano B'],
  ['Larissa Gomes', '9º ano A'],
  ['Matheus Carvalho', '9º ano A'],
  ['Natália Rocha', '9º ano B'],
  ['Rafael Barbosa', '8º ano A'],
] as const;

/** Intervalos escolares (minutos após a meia-noite, horário local). */
const BREAK_WINDOWS: ReadonlyArray<readonly [number, number, number]> = [
  [9 * 60 + 30, 10 * 60 + 15, 5], // intervalo da manhã
  [12 * 60, 13 * 60 + 10, 4], // almoço
  [15 * 60, 15 * 60 + 40, 2], // intervalo da tarde
];

const HAPPY_PATH: OrderStatus[] = ['RECEIVED', 'PREPARING', 'READY', 'DELIVERED'];

const toLocalTime = (dayStart: Date, minutes: number) => new Date(dayStart.getTime() + minutes * 60_000);

function emailFor(name: string) {
  const [first, ...rest] = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(' ');
  return `${first}.${rest[rest.length - 1]}@${DEMO_EMAIL_DOMAIN}`;
}

async function resetDemoData() {
  console.log('• --reset: removendo pedidos, produtos e estudantes…');
  await prisma.$transaction([
    prisma.order.deleteMany(),
    prisma.product.deleteMany(),
    prisma.user.deleteMany({ where: { role: 'STUDENT' } }),
  ]);
}

async function main() {
  if (env.NODE_ENV === 'production') {
    throw new Error('O seed de demonstração é bloqueado em produção.');
  }

  const demoPassword = passwordField.safeParse(process.env.SEED_DEMO_PASSWORD ?? '');
  if (!demoPassword.success) {
    throw new Error('Defina SEED_DEMO_PASSWORD (mín. 8 caracteres, com letras e números) no .env.');
  }

  if (process.argv.includes('--reset')) await resetDemoData();
  await seedBase();

  if ((await prisma.product.count()) > 0 || (await prisma.order.count()) > 0) {
    console.log('• Já existem produtos ou pedidos — seed de demonstração ignorado (use --reset).');
    return;
  }

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category.id]));

  // Produtos
  const products = PRODUCTS.map((product) => {
    const categoryId = categoryBySlug.get(product.category);
    if (!categoryId) throw new Error(`Categoria "${product.category}" não encontrada. Rode o seed base.`);
    return { ...product, id: randomUUID(), categoryId };
  });
  await prisma.product.createMany({
    data: products.map((product) => ({
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      description: product.description,
      price: new Prisma.Decimal(product.price),
      stock: product.stock,
      isAvailable: product.isAvailable ?? true,
    })),
  });
  console.log(`• ${products.length} produtos de demonstração criados.`);

  // Estudantes
  const passwordHash = await hashPassword(demoPassword.data);
  const students: Array<{ id: string; userId: string }> = [];
  for (const [index, [name, grade]] of STUDENTS.entries()) {
    const userId = randomUUID();
    const studentId = randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        name,
        email: emailFor(name),
        passwordHash,
        role: 'STUDENT',
        createdAt: new Date(Date.now() - (HISTORY_DAYS + 10 - index) * 86_400_000),
        student: {
          create: { id: studentId, registration: `2026${String(index + 1).padStart(4, '0')}`, grade },
        },
      },
    });
    students.push({ id: studentId, userId });
  }
  console.log(`• ${students.length} estudantes de demonstração criados (${DEMO_EMAIL_DOMAIN}).`);

  // Pedidos (histórico + dia atual)
  const orders: Prisma.OrderCreateManyInput[] = [];
  const items: Prisma.OrderItemCreateManyInput[] = [];
  const payments: Prisma.PaymentCreateManyInput[] = [];
  const history: Prisma.OrderStatusHistoryCreateManyInput[] = [];
  const usedCodes = new Set<string>();
  const popularity = products.filter((p) => p.isAvailable !== false).map((p) => [p, p.popularity] as const);
  const now = Date.now();

  function addOrder(createdAt: Date, status: OrderStatus, ageInDays: number) {
    const orderId = randomUUID();
    let code = generateOrderCode();
    while (usedCodes.has(code)) code = generateOrderCode();
    usedCodes.add(code);

    const chosen = new Map<string, { product: (typeof products)[number]; quantity: number }>();
    const lineCount = weightedPick([[1, 5], [2, 4], [3, 1]] as const);
    while (chosen.size < lineCount) {
      const product = weightedPick(popularity);
      chosen.set(product.id, { product, quantity: weightedPick([[1, 8], [2, 2]] as const) });
    }

    let total = new Prisma.Decimal(0);
    for (const { product, quantity } of chosen.values()) {
      const price = ageInDays > 21 && product.previousPrice ? product.previousPrice : product.price;
      const unitPrice = new Prisma.Decimal(price);
      total = total.plus(unitPrice.times(quantity));
      items.push({ id: randomUUID(), orderId, productId: product.id, productName: product.name, unitPrice, quantity });
    }

    const method = weightedPick<PaymentMethod>([['PIX', 45], ['AT_COUNTER', 30], ['CASH', 25]]);
    const flow: OrderStatus[] =
      status === 'CANCELLED' ? ['RECEIVED', 'CANCELLED'] : HAPPY_PATH.slice(0, HAPPY_PATH.indexOf(status) + 1);

    const student = pick(students);
    let cursor = createdAt.getTime();
    flow.forEach((step, index) => {
      if (index > 0) cursor = Math.min(cursor + randomInt(2, 6) * 60_000, now - 30_000);
      history.push({
        id: randomUUID(),
        orderId,
        status: step,
        // O pedido é aberto pelo estudante; as etapas seguintes, pela cantina.
        changedById: index === 0 ? student.userId : (admin?.id ?? null),
        createdAt: new Date(cursor),
      });
    });

    const paymentStatus: PaymentStatus =
      status === 'DELIVERED' ? 'PAID' : status === 'CANCELLED' ? 'CANCELLED' : 'PENDING';

    orders.push({
      id: orderId,
      code,
      studentId: student.id,
      status,
      total,
      createdAt,
      updatedAt: new Date(cursor),
      ...(random() < 0.12 && { notes: pick(['Sem cebola, por favor.', 'Vou retirar no segundo intervalo.', 'Com guardanapo extra.']) }),
    });
    payments.push({
      id: randomUUID(),
      orderId,
      method,
      status: paymentStatus,
      amount: total,
      paidAt: paymentStatus === 'PAID' ? new Date(cursor) : null,
      updatedById: paymentStatus === 'PENDING' ? null : (admin?.id ?? null),
      createdAt,
      updatedAt: new Date(cursor),
    });
  }

  // Histórico: dias letivos (segunda a sexta) anteriores a hoje.
  for (let daysAgo = HISTORY_DAYS; daysAgo >= 1; daysAgo--) {
    const dayStart = startOfLocalDay(env.APP_TIMEZONE, daysAgo);
    const weekday = new Date(dayStart.getTime() + 12 * 3_600_000).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;

    const trend = 1 + (HISTORY_DAYS - daysAgo) / HISTORY_DAYS / 2; // leve crescimento
    const count = Math.round(randomInt(9, 18) * trend);
    for (let i = 0; i < count; i++) {
      const [start, end] = weightedPick(BREAK_WINDOWS.map(([s, e, w]) => [[s, e] as const, w] as const));
      const createdAt = toLocalTime(dayStart, randomInt(start, end));
      addOrder(createdAt, random() < 0.07 ? 'CANCELLED' : 'DELIVERED', daysAgo);
    }
  }

  // Hoje: alguns entregues mais cedo e uma fila ativa para o quadro de pedidos,
  // dentro do horário escolar (a partir das 7h) sempre que possível.
  const todayStart = startOfLocalDay(env.APP_TIMEZONE, 0).getTime();
  const schoolOpensAt = todayStart + 7 * 3_600_000;
  const recent = (maxAgoMinutes: number) => {
    const latest = now - 60_000;
    let earliest = Math.max(now - maxAgoMinutes * 60_000, schoolOpensAt);
    if (earliest >= latest) earliest = Math.max(todayStart, now - maxAgoMinutes * 60_000);
    return new Date(earliest + random() * Math.max(0, latest - earliest));
  };

  for (let i = 0; i < 9; i++) addOrder(recent(240), i === 8 ? 'CANCELLED' : 'DELIVERED', 0);
  for (let i = 0; i < 2; i++) addOrder(recent(25), 'READY', 0);
  for (let i = 0; i < 3; i++) addOrder(recent(15), 'PREPARING', 0);
  for (let i = 0; i < 4; i++) addOrder(recent(8), 'RECEIVED', 0);

  await prisma.$transaction([
    prisma.order.createMany({ data: orders }),
    prisma.orderItem.createMany({ data: items }),
    prisma.payment.createMany({ data: payments }),
    prisma.orderStatusHistory.createMany({ data: history }),
  ]);
  console.log(`• ${orders.length} pedidos de demonstração criados (${HISTORY_DAYS} dias de histórico).`);
}

console.log('Executando seed de DEMONSTRAÇÃO do EstuLanches…');

try {
  await main();
  console.log('Seed de demonstração concluído.');
} catch (error) {
  console.error('Falha no seed de demonstração:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
