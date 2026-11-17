// =============================================================================
// Teste ponta a ponta (smoke test) da API do EstuLanches.
//
// Requisitos: API rodando (npm run dev) e banco com o seed de demonstração
// (npm run db:seed:demo). O teste CRIA e ALTERA dados (pedidos, estoque,
// produtos) — use apenas em ambiente de desenvolvimento. Para voltar ao
// estado inicial: npm run db:seed:demo -- --reset
//
// Uso (na pasta server):  npm run test:e2e   (ou: node scripts/e2e-smoke.mjs .env)
// Variável opcional: API_URL (padrão http://localhost:3333)
// =============================================================================
import { readFileSync } from 'node:fs';

const envFile = process.argv[2] ?? '.env';
const env = Object.fromEntries(
  readFileSync(envFile, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);

const BASE = process.env.API_URL ?? 'http://localhost:3333';
const ORIGIN = 'http://localhost:5173';
if (env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production') {
  console.error('Recusado: o smoke test altera dados e não roda em produção.');
  process.exit(1);
}

let passed = 0;
let failed = 0;

function check(name, condition, extra) {
  if (condition) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    console.log(`  ✘ ${name}`, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : '');
  }
}

async function api(method, path, { token, body, headers = {}, cookie, raw } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body && !raw ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
  const setCookie = res.headers.getSetCookie?.() ?? [];
  return { status: res.status, json, headers: res.headers, setCookie };
}

const cookieFrom = (setCookie) => setCookie.map((c) => c.split(';')[0]).join('; ');

async function login(email, password) {
  const r = await api('POST', '/api/v1/auth/login', { body: { email, password } });
  return { ...r, token: r.json?.accessToken, cookie: cookieFrom(r.setCookie) };
}

console.log('\n[1] Infra');
{
  const live = await api('GET', '/health/live');
  check('liveness 200', live.status === 200);
  const ready = await api('GET', '/health/ready');
  check('readiness 200 (banco no ar)', ready.status === 200 && ready.json.database === 'up', ready.json);
  const meta = await api('GET', '/api/v1/meta');
  check('meta expõe demoMode', meta.json?.data?.demoMode === true, meta.json);
  check('X-Request-Id presente', !!meta.headers.get('x-request-id'));
  check('Cache-Control no-store na API', meta.headers.get('cache-control') === 'no-store');
  check('helmet: X-Content-Type-Options', meta.headers.get('x-content-type-options') === 'nosniff');
  const nf = await api('GET', '/api/v1/nao-existe');
  check('rota inexistente → 404 JSON', nf.status === 404 && nf.json?.error?.code === 'ROUTE_NOT_FOUND', nf.json);
  const badJson = await api('POST', '/api/v1/auth/login', { raw: '{"email":', headers: { 'Content-Type': 'application/json' } });
  check('JSON malformado → 400 INVALID_JSON', badJson.status === 400 && badJson.json?.error?.code === 'INVALID_JSON', badJson.json);
}

console.log('\n[2] Autenticação');
const admin = await login(env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);
{
  const wrong = await api('POST', '/api/v1/auth/login', { body: { email: env.SEED_ADMIN_EMAIL, password: 'senhaErrada1' } });
  check('senha errada → 401 INVALID_CREDENTIALS', wrong.status === 401 && wrong.json?.error?.code === 'INVALID_CREDENTIALS', wrong.json);
  const unknown = await api('POST', '/api/v1/auth/login', { body: { email: 'ninguem@estulanches.test', password: 'qualquer1' } });
  check('e-mail inexistente → mesma resposta 401', unknown.status === 401 && unknown.json?.error?.message === wrong.json?.error?.message);
  check('login admin 200 + token', admin.status === 200 && !!admin.token, admin.json);
  const rt = admin.setCookie.find((c) => c.startsWith('el_rt='));
  check('cookie refresh httpOnly + SameSite=Strict + Path', !!rt && /HttpOnly/i.test(rt) && /SameSite=Strict/i.test(rt) && /Path=\/api\/v1\/auth/i.test(rt), rt);
  check('resposta não expõe passwordHash', !JSON.stringify(admin.json).includes('passwordHash'));
  const me = await api('GET', '/api/v1/auth/me', { token: admin.token });
  check('/me retorna ADMIN', me.json?.user?.role === 'ADMIN', me.json);
  const noToken = await api('GET', '/api/v1/auth/me');
  check('/me sem token → 401', noToken.status === 401);
  const forged = await api('GET', '/api/v1/auth/me', { token: admin.token.slice(0, -4) + 'abcd' });
  check('token adulterado → 401 INVALID_TOKEN', forged.status === 401 && forged.json?.error?.code === 'INVALID_TOKEN', forged.json);
  const invalidEmail = await api('POST', '/api/v1/auth/login', { body: { email: 'nao-e-email', password: 'x' } });
  check('validação de e-mail → 400 com fieldErrors', invalidEmail.status === 400 && invalidEmail.json?.error?.details?.fieldErrors?.email, invalidEmail.json);
}

console.log('\n[3] Cadastro de estudante');
const stamp = Date.now().toString(36).toUpperCase();
const newStudent = { name: 'Teste Automatizado', email: `teste.${stamp.toLowerCase()}@estulanches.test`, password: 'Senha1234', registration: `T${stamp}`, grade: '1º ano Z' };
let student;
{
  const weak = await api('POST', '/api/v1/auth/register', { body: { ...newStudent, password: 'fraca' } });
  check('senha fraca → 400', weak.status === 400 && weak.json?.error?.details?.fieldErrors?.password, weak.json);
  const reg = await api('POST', '/api/v1/auth/register', { body: newStudent });
  check('cadastro → 201 com perfil de estudante', reg.status === 201 && reg.json?.user?.student?.registration === newStudent.registration, reg.json);
  student = { token: reg.json?.accessToken, cookie: cookieFrom(reg.setCookie), user: reg.json?.user };
  const dup = await api('POST', '/api/v1/auth/register', { body: { ...newStudent, email: newStudent.email.toUpperCase() } });
  check('e-mail/matrícula duplicados → 409 com campos', dup.status === 409 && dup.json?.error?.details?.fieldErrors?.email && dup.json?.error?.details?.fieldErrors?.registration, dup.json);
}

console.log('\n[4] RBAC');
{
  const r1 = await api('GET', '/api/v1/products', { token: student.token });
  check('estudante não lista catálogo admin → 403', r1.status === 403, r1.json);
  const r2 = await api('POST', '/api/v1/products', { token: student.token, body: { name: 'X', price: 1, categoryId: '00000000-0000-0000-0000-000000000000', stock: 1 } });
  check('estudante não cria produto → 403', r2.status === 403);
  const r3 = await api('GET', '/api/v1/dashboard/summary', { token: student.token });
  check('estudante não acessa dashboard → 403', r3.status === 403);
  const r4 = await api('POST', '/api/v1/orders', { token: admin.token, body: { items: [], paymentMethod: 'PIX' } });
  check('admin não faz pedido → 403', r4.status === 403);
}

console.log('\n[5] Cardápio e pedido');
const menu = await api('GET', '/api/v1/menu', { token: student.token });
const menuProducts = menu.json?.data?.flatMap((c) => c.products) ?? [];
check('cardápio com categorias e produtos', menu.status === 200 && menuProducts.length > 0, menu.json);
check('produto indisponível fora do cardápio', !menuProducts.some((p) => p.name === 'Chá gelado de pêssego'));
const inStock = menuProducts.filter((p) => p.stock >= 5);
const [p1, p2] = inStock;
let firstOrder;
{
  const invalid = await api('POST', '/api/v1/orders', { token: student.token, body: { items: [{ productId: p1.id, quantity: 0 }], paymentMethod: 'BITCOIN' } });
  check('payload inválido → 400', invalid.status === 400 && invalid.json?.error?.code === 'VALIDATION_ERROR', invalid.json);
  const key = `test-${stamp}-1`;
  const body = { items: [{ productId: p1.id, quantity: 2 }, { productId: p2.id, quantity: 1 }, { productId: p1.id, quantity: 1 }], paymentMethod: 'PIX', notes: '  sem   cebola  ' };
  const created = await api('POST', '/api/v1/orders', { token: student.token, body, headers: { 'Idempotency-Key': key } });
  firstOrder = created.json?.data;
  const expected = Math.round((p1.price * 3 + p2.price * 1) * 100) / 100;
  check('pedido criado → 201', created.status === 201, created.json);
  check('linhas duplicadas consolidadas (qtd 3)', firstOrder?.items?.find((i) => i.productId === p1.id)?.quantity === 3, firstOrder?.items);
  check(`total calculado no servidor (${expected})`, firstOrder?.total === expected, firstOrder?.total);
  check('código curto gerado', /^[2-9A-HJ-NP-Z]{6}$/.test(firstOrder?.code ?? ''), firstOrder?.code);
  check('observação sanitizada', firstOrder?.notes === 'sem cebola', firstOrder?.notes);
  check('pagamento PENDING registrado', firstOrder?.payment?.status === 'PENDING' && firstOrder?.payment?.method === 'PIX');
  check('histórico inicial RECEIVED', firstOrder?.statusHistory?.[0]?.status === 'RECEIVED');
  const replay = await api('POST', '/api/v1/orders', { token: student.token, body, headers: { 'Idempotency-Key': key } });
  check('reenvio com mesma Idempotency-Key → 200 mesmo pedido', replay.status === 200 && replay.json?.data?.id === firstOrder?.id && replay.headers.get('idempotent-replayed') === 'true', replay.json);
  const menuAfter = await api('GET', '/api/v1/menu', { token: student.token });
  const p1After = menuAfter.json.data.flatMap((c) => c.products).find((p) => p.id === p1.id);
  check('estoque baixado uma única vez (−3)', p1After.stock === p1.stock - 3, { before: p1.stock, after: p1After.stock });
  const tooMany = await api('POST', '/api/v1/orders', { token: student.token, body: { items: [{ productId: p1.id, quantity: 20 }, { productId: p1.id, quantity: 5 }], paymentMethod: 'CASH' } });
  check('soma acima do limite por item → 422', tooMany.status === 422, tooMany.json);
}

console.log('\n[6] Isolamento entre estudantes');
const demoStudents = [];
{
  const emails = ['ana.souza', 'bruno.lima', 'carolina.mendes', 'davi.santos', 'eduarda.ribeiro', 'felipe.araujo', 'gabriela.costa', 'heitor.almeida', 'isabela.ferreira', 'joao.martins', 'larissa.gomes', 'matheus.carvalho'];
  for (const e of emails) demoStudents.push(await login(`${e}@estulanches.test`, env.SEED_DEMO_PASSWORD));
  check('12 estudantes demo autenticados', demoStudents.every((s) => s.status === 200), demoStudents.map((s) => s.status));
  const other = demoStudents[0];
  const peek = await api('GET', `/api/v1/orders/${firstOrder.id}`, { token: other.token });
  check('pedido de outro estudante → 404', peek.status === 404, peek.json);
  const list = await api('GET', '/api/v1/orders?pageSize=100', { token: student.token });
  check('listagem só traz pedidos próprios', list.json?.data?.every((o) => o.student.id === student.user.student.id), list.json?.meta);
  const spoof = await api('GET', `/api/v1/orders?studentId=${other.json.user.student.id}`, { token: student.token });
  check('filtro studentId ignorado para estudantes', spoof.json?.data?.every((o) => o.student.id === student.user.student.id));
  const cancelOther = await api('PATCH', `/api/v1/orders/${firstOrder.id}/status`, { token: other.token, body: { status: 'CANCELLED' } });
  check('não cancela pedido alheio → 404', cancelOther.status === 404);
}

console.log('\n[7] Concorrência: 12 compras simultâneas da ÚLTIMA unidade');
{
  const target = inStock[2];
  const set = await api('PATCH', `/api/v1/products/${target.id}`, { token: admin.token, body: { stock: 1 } });
  check('admin define estoque = 1', set.status === 200 && set.json?.data?.stock === 1, set.json);
  const results = await Promise.all(
    demoStudents.map((s, i) =>
      api('POST', '/api/v1/orders', { token: s.token, body: { items: [{ productId: target.id, quantity: 1 }], paymentMethod: 'CASH' }, headers: { 'Idempotency-Key': `race-${stamp}-${i}` } }),
    ),
  );
  const ok = results.filter((r) => r.status === 201).length;
  const conflicts = results.filter((r) => r.status === 409 && r.json?.error?.code === 'CART_UNAVAILABLE').length;
  check(`exatamente 1 venda aprovada (aprovadas: ${ok})`, ok === 1, results.map((r) => r.status));
  check(`demais recusadas com 409 (${conflicts})`, conflicts === demoStudents.length - 1, results.map((r) => r.json?.error?.code));
  const after = await api('GET', `/api/v1/products/${target.id}`, { token: admin.token });
  check('estoque final = 0 (nunca negativo)', after.json?.data?.stock === 0, after.json?.data?.stock);
  const conflict = results.find((r) => r.status === 409);
  check('erro informa o item e o motivo', conflict?.json?.error?.details?.issues?.[0]?.productId === target.id, conflict?.json);
}

console.log('\n[8] Preço congelado no pedido');
{
  const newPrice = Math.round((p2.price + 1.25) * 100) / 100;
  const upd = await api('PATCH', `/api/v1/products/${p2.id}`, { token: admin.token, body: { price: newPrice } });
  check('admin altera preço', upd.status === 200 && upd.json?.data?.price === newPrice, upd.json);
  const order = await api('GET', `/api/v1/orders/${firstOrder.id}`, { token: student.token });
  const item = order.json?.data?.items?.find((i) => i.productId === p2.id);
  check('item mantém preço da compra', item?.unitPrice === p2.price, { item, old: p2.price });
  check('total do pedido inalterado', order.json?.data?.total === firstOrder.total);
  await api('PATCH', `/api/v1/products/${p2.id}`, { token: admin.token, body: { price: p2.price } });
}

console.log('\n[9] Máquina de estados e cancelamento');
{
  const toPrep = await api('PATCH', `/api/v1/orders/${firstOrder.id}/status`, { token: admin.token, body: { status: 'PREPARING' } });
  check('RECEIVED → PREPARING', toPrep.status === 200 && toPrep.json?.data?.status === 'PREPARING', toPrep.json);
  const skip = await api('PATCH', `/api/v1/orders/${firstOrder.id}/status`, { token: admin.token, body: { status: 'DELIVERED' } });
  check('PREPARING → DELIVERED bloqueado (422)', skip.status === 422 && skip.json?.error?.code === 'INVALID_TRANSITION', skip.json);
  const studentCancel = await api('PATCH', `/api/v1/orders/${firstOrder.id}/status`, { token: student.token, body: { status: 'CANCELLED' } });
  check('estudante não cancela em preparo (422)', studentCancel.status === 422 && studentCancel.json?.error?.code === 'CANCEL_NOT_ALLOWED', studentCancel.json);
  await api('PATCH', `/api/v1/orders/${firstOrder.id}/status`, { token: admin.token, body: { status: 'READY' } });
  const delivered = await api('PATCH', `/api/v1/orders/${firstOrder.id}/status`, { token: admin.token, body: { status: 'DELIVERED', markAsPaid: true } });
  check('READY → DELIVERED marcando pago', delivered.json?.data?.status === 'DELIVERED' && delivered.json?.data?.payment?.status === 'PAID' && delivered.json?.data?.payment?.paidAt, delivered.json?.data?.payment);
  check('histórico com 4 etapas', delivered.json?.data?.statusHistory?.length === 4);
  const reopen = await api('PATCH', `/api/v1/orders/${firstOrder.id}/status`, { token: admin.token, body: { status: 'CANCELLED' } });
  check('pedido entregue é final (422)', reopen.status === 422);

  // Estudante cancela pedido ainda "Recebido" → estoque devolvido
  const before = (await api('GET', `/api/v1/products/${p2.id}`, { token: admin.token })).json.data.stock;
  const o2 = await api('POST', '/api/v1/orders', { token: student.token, body: { items: [{ productId: p2.id, quantity: 2 }], paymentMethod: 'AT_COUNTER' } });
  const mid = (await api('GET', `/api/v1/products/${p2.id}`, { token: admin.token })).json.data.stock;
  const cancel = await api('PATCH', `/api/v1/orders/${o2.json.data.id}/status`, { token: student.token, body: { status: 'CANCELLED' } });
  const after = (await api('GET', `/api/v1/products/${p2.id}`, { token: admin.token })).json.data.stock;
  check('estudante cancela pedido recebido', cancel.status === 200 && cancel.json?.data?.status === 'CANCELLED', cancel.json);
  check('estoque devolvido no cancelamento', mid === before - 2 && after === before, { before, mid, after });
  check('pagamento marcado como CANCELLED', cancel.json?.data?.payment?.status === 'CANCELLED');
  const payCancelled = await api('PATCH', `/api/v1/orders/${o2.json.data.id}/payment`, { token: admin.token, body: { status: 'PAID' } });
  check('não altera pagamento de pedido cancelado (422)', payCancelled.status === 422);
}

console.log('\n[10] Gestão de catálogo');
let createdProductId;
{
  const cats = await api('GET', '/api/v1/categories?includeInactive=true', { token: admin.token });
  check('categorias com contagem de produtos', cats.status === 200 && typeof cats.json?.data?.[0]?.productCount === 'number', cats.json);
  const newCat = await api('POST', '/api/v1/categories', { token: admin.token, body: { name: `Combos ${stamp}` } });
  check('cria categoria', newCat.status === 201, newCat.json);
  const dupCat = await api('POST', '/api/v1/categories', { token: admin.token, body: { name: `combos ${stamp.toLowerCase()}` } });
  check('categoria duplicada (case-insensitive) → 409', dupCat.status === 409, dupCat.json);
  const ids = [newCat.json.data.id, ...cats.json.data.map((c) => c.id)];
  const reorder = await api('PUT', '/api/v1/categories/order', { token: admin.token, body: { ids } });
  check('reordena categorias', reorder.status === 200 && reorder.json?.data?.[0]?.id === newCat.json.data.id, reorder.json);
  const badReorder = await api('PUT', '/api/v1/categories/order', { token: admin.token, body: { ids: ids.slice(1) } });
  check('reordenação incompleta → 400', badReorder.status === 400);

  // Upload de imagem (PNG 1x1 válido) e arquivo falso
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const form = new FormData();
  form.append('image', new Blob([png], { type: 'image/png' }), 'coxinha.png');
  const up = await fetch(`${BASE}/api/v1/uploads/images`, { method: 'POST', headers: { Authorization: `Bearer ${admin.token}` }, body: form });
  const upJson = await up.json();
  check('upload PNG válido → 201', up.status === 201 && /\.png$/.test(upJson?.data?.key), upJson);
  const fake = new FormData();
  fake.append('image', new Blob([Buffer.from('<script>alert(1)</script>xxxxxxxx')], { type: 'image/png' }), 'evil.png');
  const upFake = await fetch(`${BASE}/api/v1/uploads/images`, { method: 'POST', headers: { Authorization: `Bearer ${admin.token}` }, body: fake });
  check('arquivo disfarçado de PNG → 415', upFake.status === 415, await upFake.json());
  const svg = new FormData();
  svg.append('image', new Blob(['<svg/>'], { type: 'image/svg+xml' }), 'x.svg');
  const upSvg = await fetch(`${BASE}/api/v1/uploads/images`, { method: 'POST', headers: { Authorization: `Bearer ${admin.token}` }, body: svg });
  check('SVG rejeitado → 415', upSvg.status === 415);
  const img = await fetch(`${BASE}${upJson.data.url}`);
  check('imagem servida com nosniff + cache imutável', img.status === 200 && img.headers.get('x-content-type-options') === 'nosniff' && /immutable/.test(img.headers.get('cache-control') ?? ''), Object.fromEntries(img.headers));

  const prod = await api('POST', '/api/v1/products', { token: admin.token, body: { name: `Combo teste ${stamp}`, description: 'Coxinha + suco', price: 11.9, categoryId: newCat.json.data.id, stock: 10, imageKey: upJson.data.key } });
  createdProductId = prod.json?.data?.id;
  check('cria produto com imagem', prod.status === 201 && prod.json?.data?.imageUrl?.endsWith(upJson.data.key), prod.json);
  const dupProd = await api('POST', '/api/v1/products', { token: admin.token, body: { name: `COMBO TESTE ${stamp}`, price: 5, categoryId: newCat.json.data.id, stock: 1 } });
  check('produto duplicado → 409', dupProd.status === 409, dupProd.json);
  const badPrice = await api('POST', '/api/v1/products', { token: admin.token, body: { name: 'Preço ruim', price: 1.234, categoryId: newCat.json.data.id, stock: 1 } });
  check('preço com 3 casas → 400', badPrice.status === 400, badPrice.json);
  const adj = await api('POST', `/api/v1/products/${createdProductId}/stock-adjustments`, { token: admin.token, body: { delta: -4 } });
  check('ajuste atômico de estoque (−4)', adj.json?.data?.stock === 6, adj.json);
  const neg = await api('POST', `/api/v1/products/${createdProductId}/stock-adjustments`, { token: admin.token, body: { delta: -7 } });
  check('ajuste que negativaria → 422', neg.status === 422, neg.json);
  const catInUse = await api('DELETE', `/api/v1/categories/${newCat.json.data.id}`, { token: admin.token });
  check('categoria com produtos não é excluída (409)', catInUse.status === 409, catInUse.json);
  const del = await api('DELETE', `/api/v1/products/${createdProductId}`, { token: admin.token });
  check('produto sem vendas → exclusão física', del.json?.data?.archived === false, del.json);
  const delSold = await api('DELETE', `/api/v1/products/${p1.id}`, { token: admin.token });
  check('produto com vendas → arquivado', delSold.json?.data?.archived === true, delSold.json);
  const histKept = await api('GET', `/api/v1/orders/${firstOrder.id}`, { token: admin.token });
  check('histórico preservado após arquivar', histKept.json?.data?.items?.some((i) => i.productId === p1.id));
  const catDel = await api('DELETE', `/api/v1/categories/${newCat.json.data.id}`, { token: admin.token });
  check('categoria vazia excluída', catDel.status === 204, catDel.json);
}

console.log('\n[11] Dashboard e estudantes');
{
  const summary = await api('GET', '/api/v1/dashboard/summary', { token: admin.token });
  const s = summary.json?.data;
  check('summary com KPIs', summary.status === 200 && typeof s?.today?.revenue === 'number' && s?.today?.orders > 0, s);
  console.log('     hoje:', JSON.stringify(s?.today), '| ontem:', JSON.stringify(s?.yesterday), '| pendentes:', JSON.stringify(s?.pendingOrders));
  const sales = await api('GET', '/api/v1/dashboard/sales?days=7', { token: admin.token });
  check('série de 7 dias completa', sales.json?.data?.length === 7, sales.json);
  const sales30 = await api('GET', '/api/v1/dashboard/sales?days=30', { token: admin.token });
  check('série de 30 dias completa', sales30.json?.data?.length === 30);
  const badRange = await api('GET', '/api/v1/dashboard/sales?days=5', { token: admin.token });
  check('período inválido → 400', badRange.status === 400);
  const top = await api('GET', '/api/v1/dashboard/top-products?days=30&limit=5', { token: admin.token });
  check('top 5 produtos', top.json?.data?.length === 5 && top.json.data[0].quantity >= top.json.data[4].quantity, top.json);
  const hours = await api('GET', '/api/v1/dashboard/sales-by-hour?days=30', { token: admin.token });
  check('pedidos por hora', hours.status === 200 && hours.json?.data?.length > 0, hours.json);
  const list = await api('GET', '/api/v1/students?search=souza', { token: admin.token });
  check('busca de estudantes', list.json?.data?.length >= 1 && typeof list.json.data[0].totalSpent === 'number', list.json);
  const detail = await api('GET', `/api/v1/students/${list.json.data[0].id}`, { token: admin.token });
  check('detalhe com favoritos e ticket médio', Array.isArray(detail.json?.data?.favoriteProducts) && typeof detail.json?.data?.averageTicket === 'number', detail.json);
  const orders = await api('GET', `/api/v1/orders?studentId=${list.json.data[0].id}&pageSize=5`, { token: admin.token });
  check('histórico do estudante (admin)', orders.status === 200 && orders.json?.data?.every((o) => o.student.id === list.json.data[0].id));
  const board = await api('GET', '/api/v1/orders?scope=active&sort=oldest&pageSize=50', { token: admin.token });
  check('fila ativa para o quadro', board.status === 200 && board.json?.data?.every((o) => ['RECEIVED', 'PREPARING', 'READY'].includes(o.status)));
  const search = await api('GET', `/api/v1/orders?search=%23${firstOrder.code}`, { token: admin.token });
  check('busca por código (#)', search.json?.data?.[0]?.id === firstOrder.id, search.json?.meta);
}

console.log('\n[12] Sessão: refresh, rotação, desativação e logout');
{
  const badOrigin = await api('POST', '/api/v1/auth/refresh', { cookie: student.cookie, headers: { Origin: 'https://evil.example' } });
  check('refresh de origem desconhecida → 403', badOrigin.status === 403);
  const anonymous = await api('POST', '/api/v1/auth/refresh', { headers: { Origin: ORIGIN } });
  check('refresh sem sessão (visitante) → 204', anonymous.status === 204, anonymous.status);
  const r1 = await api('POST', '/api/v1/auth/refresh', { cookie: student.cookie, headers: { Origin: ORIGIN } });
  check('refresh → novo access token', r1.status === 200 && !!r1.json?.accessToken, r1.json);
  const rotated = cookieFrom(r1.setCookie);
  check('refresh token rotacionado', rotated && rotated !== student.cookie);
  const logout = await api('POST', '/api/v1/auth/logout', { cookie: rotated, headers: { Origin: ORIGIN } });
  check('logout → 204 e limpa cookie', logout.status === 204 && logout.setCookie.some((c) => c.startsWith('el_rt=;')), logout.setCookie);
  const afterLogout = await api('POST', '/api/v1/auth/refresh', { cookie: rotated, headers: { Origin: ORIGIN } });
  check('refresh após logout → 401', afterLogout.status === 401, afterLogout.json);
  const graceReuse = await api('POST', '/api/v1/auth/refresh', { cookie: student.cookie, headers: { Origin: ORIGIN } });
  check('família revogada no logout (token antigo também morre)', graceReuse.status === 401, graceReuse.json);

  const victim = demoStudents[11];
  const victimId = victim.json.user.student.id;
  const off = await api('PATCH', `/api/v1/students/${victimId}/status`, { token: admin.token, body: { isActive: false } });
  check('admin desativa estudante', off.json?.data?.isActive === false, off.json);
  const blockedRefresh = await api('POST', '/api/v1/auth/refresh', { cookie: victim.cookie, headers: { Origin: ORIGIN } });
  check('sessões do desativado revogadas', blockedRefresh.status === 401, blockedRefresh.json);
  const blockedLogin = await login('matheus.carvalho@estulanches.test', env.SEED_DEMO_PASSWORD);
  check('login de conta desativada → 403', blockedLogin.status === 403 && blockedLogin.json?.error?.code === 'ACCOUNT_DISABLED', blockedLogin.json);
  const on = await api('PATCH', `/api/v1/students/${victimId}/status`, { token: admin.token, body: { isActive: true } });
  check('admin reativa estudante', on.json?.data?.isActive === true);
}

console.log('\n[13] Minha conta: perfil e troca de senha');
{
  const acc = { name: 'Conta Teste', email: `conta.${stamp.toLowerCase()}@estulanches.test`, password: 'Senha1234', registration: `C${stamp}`, grade: '2º ano X' };
  const deviceA = await api('POST', '/api/v1/auth/register', { body: acc });
  const tokenA = deviceA.json?.accessToken;
  const cookieA = cookieFrom(deviceA.setCookie);
  const deviceB = await login(acc.email, acc.password);
  check('duas sessões abertas (aparelhos A e B)', deviceA.status === 201 && deviceB.status === 200);

  const profile = await api('PATCH', '/api/v1/auth/me', { token: tokenA, body: { name: '  Conta   Atualizada ', grade: '3º ano Y' } });
  check('perfil atualizado e sanitizado', profile.status === 200 && profile.json?.user?.name === 'Conta Atualizada' && profile.json?.user?.student?.grade === '3º ano Y', profile.json);
  const emptyProfile = await api('PATCH', '/api/v1/auth/me', { token: tokenA, body: {} });
  check('perfil sem alterações → 400', emptyProfile.status === 400);
  const adminGrade = await api('PATCH', '/api/v1/auth/me', { token: admin.token, body: { grade: '1º ano' } });
  check('admin não tem turma → 400', adminGrade.status === 400 && adminGrade.json?.error?.code === 'GRADE_NOT_ALLOWED', adminGrade.json);

  const wrong = await api('PATCH', '/api/v1/auth/password', { token: tokenA, body: { currentPassword: 'Errada123', newPassword: 'NovaSenha456' } });
  check('senha atual errada → 400 com campo', wrong.status === 400 && wrong.json?.error?.details?.fieldErrors?.currentPassword, wrong.json);
  const same = await api('PATCH', '/api/v1/auth/password', { token: tokenA, body: { currentPassword: acc.password, newPassword: acc.password } });
  check('nova senha igual à atual → 400', same.status === 400, same.json);
  const weak = await api('PATCH', '/api/v1/auth/password', { token: tokenA, body: { currentPassword: acc.password, newPassword: 'curta' } });
  check('nova senha fraca → 400', weak.status === 400);

  const changed = await api('PATCH', '/api/v1/auth/password', { token: tokenA, cookie: cookieA, body: { currentPassword: acc.password, newPassword: 'NovaSenha456' } });
  check('troca de senha → 204', changed.status === 204, changed.json);
  const keepA = await api('POST', '/api/v1/auth/refresh', { cookie: cookieA, headers: { Origin: ORIGIN } });
  check('sessão do aparelho atual mantida', keepA.status === 200, keepA.json);
  const dropB = await api('POST', '/api/v1/auth/refresh', { cookie: deviceB.cookie, headers: { Origin: ORIGIN } });
  check('sessão de outro aparelho encerrada', dropB.status === 401, dropB.json);
  const oldLogin = await login(acc.email, acc.password);
  check('senha antiga não entra mais', oldLogin.status === 401);
  const newLogin = await login(acc.email, 'NovaSenha456');
  check('nova senha funciona', newLogin.status === 200);
  const noAuth = await api('PATCH', '/api/v1/auth/password', { body: { currentPassword: 'x', newPassword: 'NovaSenha789' } });
  check('troca de senha exige autenticação → 401', noAuth.status === 401);
}

console.log(`\nResultado: ${passed} ok, ${failed} falha(s)`);
process.exit(failed ? 1 : 0);
