# EstuLanches

**A cantina escolar sem fila.** Plataforma web de gestão de cantina escolar: o estudante faz o pedido pelo celular, escolhe como pagar e retira quando estiver pronto. A cantina acompanha pedidos, estoque e vendas em tempo real.

O sistema tem dois ambientes integrados que compartilham a mesma API e o mesmo banco de dados:

| Ambiente | Para quem | O que oferece |
|---|---|---|
| **Painel administrativo** (`/admin`) | Equipe da cantina | Dashboard com indicadores e gráficos, quadro de pedidos em tempo real, gestão de produtos, estoque, cardápio, categorias e estudantes |
| **App do estudante** (`/aluno`) | Alunos | Cardápio com busca e categorias, carrinho, checkout com forma de pagamento, acompanhamento do pedido e histórico |

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Stack](#stack)
- [Como rodar localmente](#como-rodar-localmente)
- [Scripts](#scripts)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Dados de demonstração](#dados-de-demonstração)
- [Estrutura de pastas](#estrutura-de-pastas)
- [API REST](#api-rest)
- [Regras de negócio e integridade](#regras-de-negócio-e-integridade)
- [Segurança](#segurança)
- [Testes e verificação](#testes-e-verificação)
- [Decisões técnicas](#decisões-técnicas)
- [Próximos passos](#próximos-passos)

A arquitetura detalhada (diagramas, modelo de dados, fluxos e roteiro de escalabilidade) está em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

---

## Funcionalidades

### Painel administrativo
- **Dashboard:** faturamento do dia (com variação contra ontem no mesmo horário e tendência de 7 dias), pedidos do dia e ticket médio, pedidos pendentes por etapa, produtos cadastrados e alerta de reposição.
- **Gráficos:** vendas da semana, faturamento por período (7, 30 ou 90 dias), produtos mais vendidos e horários de pico. Todo gráfico tem uma versão em tabela, para acessibilidade.
- **Pedidos:** quadro operacional (Recebido → Em preparação → Pronto) com tempo de espera e avanço em um clique; lista completa com filtros por status, período e busca por código, estudante ou matrícula; drawer de detalhes com itens, pagamento, histórico auditável e cancelamento com motivo.
- **Produtos:** cadastro e edição com foto (upload com pré-visualização), descrição, preço, categoria, estoque e disponibilidade; ajuste rápido de estoque; filtros persistidos na URL; exclusão segura (produto que já foi vendido é arquivado, não apagado).
- **Cardápio:** categorias ordenáveis, visibilidade por categoria, criação, renomeação e exclusão, edição de preço inline e disponibilidade por produto.
- **Estudantes:** listagem com busca e totais (pedidos, valor gasto, último pedido); ficha com favoritos, ticket médio, histórico de pedidos e ativação ou desativação de acesso.

### App do estudante
- Saudação personalizada, banner do pedido em andamento, busca e filtro por categoria.
- Cards com foto (ou ilustração por categoria), descrição, preço e disponibilidade ("Últimas 3", "Esgotado").
- Carrinho persistente que se concilia com o cardápio atual (avisa sobre itens esgotados ou com estoque insuficiente).
- Checkout com **Dinheiro**, **PIX** ou **Pagamento na cantina**, observações e código único do pedido.
- Acompanhamento ao vivo (linha do tempo com horários), aviso quando o pedido fica pronto e cancelamento enquanto o pedido ainda não entrou em preparo.

### Transversal
- **Minha conta** (aluno e admin): edição de nome e turma, troca de senha com confirmação da senha atual e encerramento automático das sessões em outros dispositivos.
- Landing page de produto, login e cadastro com validação, feedback (toasts, loading, empty states e estados de erro) e layout responsivo de 360 px a desktop.

---

## Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4, React Router 8, TanStack Query, React Hook Form + Zod, Recharts, Lucide, Sonner |
| Backend | Node.js (≥ 22.22), Express 5, TypeScript, Zod, jose (JWT), bcryptjs, Helmet, express-rate-limit, Multer, Pino |
| Banco | PostgreSQL (testado no 18) + Prisma ORM 7 (adapter `pg`) |
| Monorepo | npm workspaces (`server/` e `web/`) |

---

## Como rodar com Docker

Só é preciso ter o **Docker** (Docker Desktop no Windows/macOS). Não precisa de Node nem de PostgreSQL instalados.

```bash
docker compose up -d --build     # ou: npm run docker:up
```

Acesse **http://localhost:8080**. Na primeira subida o Compose:

1. cria o PostgreSQL 18 (dados no volume `pgdata`);
2. roda o serviço `migrate`, que aplica as migrations, o seed base e, por padrão, o seed de demonstração, e depois encerra;
3. sobe a API (só na rede interna) quando o banco está pronto;
4. sobe o nginx com o front compilado, que faz proxy de `/api` e `/uploads` para a API (mesma origem, então o cookie `SameSite=Strict` funciona).

| Serviço | Imagem | Porta no host |
|---|---|---|
| `web` | nginx + build do Vite (`web/Dockerfile`) | 8080 |
| `api` | Node 24 alpine, só dependências de produção, usuário sem root (`server/Dockerfile`) | interna (3333) |
| `migrate` | mesmo Dockerfile, target `migrate` | executa e encerra |
| `db` | `postgres:18-alpine` | 5433 (para não conflitar com um PostgreSQL local na 5432) |

**Contas padrão:** admin `admin@estulanches.com.br` / `Admin12345`; alunos de demonstração usam a senha `Aluno12345`.

Para mudar portas, senhas, o segredo JWT ou desligar a demonstração, copie `.env.example` (da raiz) para `.env`. Os padrões do `docker-compose.yml` servem apenas para uso local: **em produção defina `JWT_ACCESS_SECRET`, `POSTGRES_PASSWORD` e `SEED_ADMIN_PASSWORD`** e sirva atrás de HTTPS.

| Comando | O que faz |
|---|---|
| `npm run docker:up` | Build e sobe tudo em segundo plano |
| `npm run docker:logs` | Acompanha os logs da API e do nginx |
| `npm run docker:down` | Para os containers (mantém o banco e as fotos de produtos) |
| `npm run docker:reset` | Para e **apaga** os volumes (banco e uploads) |
| `docker compose run --rm -e NODE_ENV=development migrate npm run db:seed:demo -- --reset` | Recria os dados de demonstração |

Teste ponta a ponta contra os containers (na pasta `server`, com `SEED_*` no `.env` iguais aos do Compose):

```bash
API_URL=http://localhost:8080 E2E_ORIGIN=http://localhost:8080 npm run test:e2e
```

---

## Como rodar localmente

### Pré-requisitos
- **Node.js ≥ 22.22** (testado com Node 25)
- **PostgreSQL ≥ 14** em execução (testado com PostgreSQL 18)

### Passo a passo

```bash
# 1. Instale as dependências (raiz do projeto)
npm install

# 2. Crie o banco de dados (psql ou pgAdmin)
#    CREATE DATABASE estulanches;

# 3. Configure as variáveis de ambiente da API
cp server/.env.example server/.env
#    Edite server/.env:
#    - DATABASE_URL com usuário e senha do seu PostgreSQL
#    - JWT_ACCESS_SECRET (gere com o comando abaixo)
#    - SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (conta administradora inicial)
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 4. Aplique as migrations e crie os dados base (categorias + admin)
npm run setup

# 5. (Opcional) Popule com dados de DEMONSTRAÇÃO
#    Defina SEED_DEMO_PASSWORD e DEMO_MODE=true no server/.env
npm run db:seed:demo

# 6. Suba API (porta 3333) e web (porta 5173)
npm run dev
```

Acesse **http://localhost:5173**. Em desenvolvimento, o Vite encaminha `/api` e `/uploads` para a API, de modo que front e API ficam na mesma origem e o cookie de sessão (`SameSite=Strict`) funciona sem configuração extra.

### Produção sem Docker

```bash
npm run build          # gera server/dist e web/dist
npm run db:deploy      # aplica migrations pendentes
npm start              # inicia a API compilada (NODE_ENV=production)
```

Sirva `web/dist` em qualquer host estático ou CDN. Se a API estiver em outro domínio, defina `VITE_API_URL` no build do front e `CORS_ORIGINS` na API. Recomendações de cabeçalhos para o front: CSP restritiva (`default-src 'self'`), HSTS e `X-Content-Type-Options`.

---

## Scripts

Execute na raiz do projeto:

| Script | O que faz |
|---|---|
| `npm run dev` | API (watch) e web (Vite) juntas |
| `npm run build` | Build de produção dos dois apps |
| `npm start` | Inicia a API compilada |
| `npm run typecheck` | Checagem de tipos nos dois apps |
| `npm test` | Testes unitários (test runner nativo do Node, sem banco) |
| `npm run setup` | `db:deploy` + `db:seed` (primeira instalação) |
| `npm run db:migrate` | Cria e aplica migrations em desenvolvimento |
| `npm run db:deploy` | Aplica migrations pendentes (produção/CI) |
| `npm run db:seed` | Dados base idempotentes (categorias + admin vindos do `.env`) |
| `npm run db:seed:demo` | Dados de demonstração (`-- --reset` recria do zero; bloqueado em produção) |
| `npm run db:studio` | Prisma Studio |
| `npm run test:e2e` | Teste ponta a ponta da API (requer API rodando e seed de demonstração) |

---

## Variáveis de ambiente

API (`server/.env`, veja [`server/.env.example`](server/.env.example)):

| Variável | Descrição | Padrão |
|---|---|---|
| `DATABASE_URL` | Conexão PostgreSQL | — (obrigatória) |
| `JWT_ACCESS_SECRET` | Segredo do JWT (≥ 32 caracteres) | — (obrigatória) |
| `ACCESS_TOKEN_TTL_SECONDS` | Validade do access token | `900` |
| `REFRESH_TOKEN_TTL_DAYS` | Validade da sessão (refresh token) | `7` |
| `APP_TIMEZONE` | Fuso dos relatórios ("hoje", "semana") | `America/Sao_Paulo` |
| `CORS_ORIGINS` | Origens autorizadas (separadas por vírgula) | `http://localhost:5173` |
| `TRUST_PROXY` | Saltos de proxy confiáveis (`1`, `true`…) | `false` |
| `UPLOADS_DIR` / `PUBLIC_UPLOADS_URL` | Pasta e URL pública das imagens | `uploads` / `/uploads` |
| `MAX_UPLOAD_SIZE_MB` | Tamanho máximo de imagem | `2` |
| `DEMO_MODE` | Exibe o selo "Ambiente de demonstração" | `false` |
| `LOG_LEVEL` | Nível de log (pino) | `info` |
| `SEED_ADMIN_*` | Conta administradora criada pelo seed | — |
| `SEED_DEMO_PASSWORD` | Senha das contas de estudantes de demonstração | — |

Web (`web/.env`, opcional): `VITE_API_URL` (padrão `/api/v1`).

> Nenhum segredo fica no código-fonte. Os arquivos `.env` estão no `.gitignore`.

---

## Dados de demonstração

`npm run db:seed:demo` cria um ambiente **fictício e claramente identificado**:

- 22 produtos em 5 categorias (com casos de estoque baixo, esgotado e produto oculto);
- 14 estudantes com e-mails no domínio reservado **`@estulanches.test`** (por exemplo `ana.souza@estulanches.test`) e a senha definida em `SEED_DEMO_PASSWORD`;
- cerca de 570 pedidos em 45 dias letivos, concentrados nos horários de intervalo, com reajustes de preço que demonstram o histórico de preços preservado, além de uma fila ativa no dia atual.

Com `DEMO_MODE=true`, a interface exibe o selo **"Ambiente de demonstração"**. O administrador é o definido em `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

---

## Estrutura de pastas

```
EstuLancher/
├── package.json                # workspaces + scripts orquestradores
├── docs/ARQUITETURA.md         # arquitetura, modelo de dados, fluxos, escala
├── server/                     # API REST
│   ├── prisma/
│   │   ├── schema.prisma       # modelo relacional
│   │   ├── migrations/         # SQL versionado (inclui CHECK constraints)
│   │   ├── seed.ts             # dados base (idempotente)
│   │   ├── seed-demo.ts        # dados de demonstração
│   │   └── seeds/base.ts
│   ├── scripts/e2e-smoke.mjs   # teste ponta a ponta da API
│   └── src/
│       ├── server.ts           # bootstrap, graceful shutdown, jobs
│       ├── app.ts              # composição do Express (segurança, rotas)
│       ├── routes.ts           # API versionada (/api/v1)
│       ├── config/env.ts       # variáveis de ambiente validadas (Zod)
│       ├── lib/                # prisma, logger, tokens, senhas, storage
│       ├── middlewares/        # auth, RBAC, rate limit, erros, upload, logs
│       ├── shared/             # erros, dinheiro, paginação, fuso, validação
│       └── modules/            # um módulo por domínio
│           ├── auth/           #   routes → controller → service → repository
│           ├── categories/
│           ├── products/
│           ├── menu/
│           ├── orders/         #   + máquina de estados e código do pedido
│           ├── students/
│           ├── dashboard/
│           ├── uploads/        #   + verificação de assinatura binária
│           └── system/         #   health checks e metadados
└── web/                        # SPA React
    └── src/
        ├── app/                # providers, rotas (code splitting), query client
        ├── components/
        │   ├── ui/             # design system próprio
        │   └── brand/          # logotipo
        ├── features/           # lógica por domínio (API, hooks, componentes)
        │   ├── auth/ cart/ menu/ orders/ products/
        │   └── categories/ students/ dashboard/ meta/
        ├── layouts/            # painel, app do estudante, autenticação
        ├── pages/              # landing, auth, admin/*, student/*
        ├── lib/                # cliente HTTP (refresh automático), formatação
        ├── styles/globals.css  # tokens de design (Tailwind 4 @theme)
        └── types/api.ts        # contratos da API
```

---

## API REST

Base: `/api/v1`. Respostas em JSON. Erros sempre no formato:

```json
{ "error": { "code": "CART_UNAVAILABLE", "message": "Kibe esgotou. Revise seu carrinho.", "details": { … }, "requestId": "…" } }
```

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/auth/register` | público | Cadastro de estudante |
| POST | `/auth/login` | público | Login (access token + cookie de sessão) |
| POST | `/auth/refresh` | cookie | Renova a sessão (rotação do refresh token) |
| POST | `/auth/logout` | cookie | Encerra a sessão |
| GET | `/auth/me` | autenticado | Usuário atual |
| PATCH | `/auth/me` | autenticado | Atualiza nome (e turma, para estudantes) |
| PATCH | `/auth/password` | autenticado | Troca a senha e encerra as sessões de outros dispositivos |
| GET | `/meta` | público | Configurações públicas (modo demo, fuso) |
| GET | `/menu` | autenticado | Cardápio publicado |
| GET | `/categories` | autenticado | Categorias (`?includeInactive=true` para admin) |
| POST · PATCH · DELETE | `/categories[/:id]` | admin | Gestão de categorias |
| PUT | `/categories/order` | admin | Reordenação |
| GET · POST | `/products` | admin | Catálogo (filtros, ordenação, paginação) e cadastro |
| GET · PATCH · DELETE | `/products/:id` | admin | Detalhe, edição, exclusão ou arquivamento |
| POST | `/products/:id/stock-adjustments` | admin | Ajuste atômico de estoque (`{ delta }`) |
| POST | `/uploads/images` | admin | Upload de imagem (`multipart`, campo `image`) |
| GET | `/orders` | por papel | Admin: todos; estudante: apenas os próprios |
| POST | `/orders` | estudante | Finaliza pedido (header `Idempotency-Key`) |
| GET | `/orders/:id` | por papel | Detalhe com histórico de status |
| PATCH | `/orders/:id/status` | por papel | Admin: transições válidas; estudante: cancelar enquanto "Recebido" |
| PATCH | `/orders/:id/payment` | admin | Registrar pagamento (`PAID`/`PENDING`) |
| GET | `/students` · `/students/:id` | admin | Estudantes e ficha completa |
| PATCH | `/students/:id/status` | admin | Ativar/desativar acesso (revoga sessões) |
| GET | `/dashboard/summary` | admin | Indicadores do dia |
| GET | `/dashboard/sales?days=7\|30\|90` | admin | Série diária de faturamento e pedidos |
| GET | `/dashboard/top-products` | admin | Mais vendidos |
| GET | `/dashboard/sales-by-hour` | admin | Pedidos por hora do dia |

Probes de infraestrutura: `GET /health/live` e `GET /health/ready` (verifica o banco).

---

## Regras de negócio e integridade

| Regra | Como é garantida |
|---|---|
| Estudante faz vários pedidos; pedido tem vários produtos | `students 1—N orders 1—N order_items` com chaves estrangeiras |
| Preço registrado no momento da compra | `order_items.unit_price` e `product_name` são snapshots capturados no mesmo `UPDATE … RETURNING` que baixa o estoque |
| Sem pedidos com produtos indisponíveis | Pré-validação (lista todos os problemas) **e** condição no próprio `UPDATE` (disponível, categoria ativa, não arquivado) |
| Sem quantidade acima do estoque | `UPDATE products SET stock = stock - qtd WHERE stock >= qtd` + `CHECK (stock >= 0)` no banco |
| Estoque atualizado com segurança / compras simultâneas | Transação no PostgreSQL; o `UPDATE` condicional bloqueia a linha e reavalia a condição. Testado com 12 compras simultâneas da última unidade: exatamente 1 aprovada |
| Identificador único do pedido | UUID v7 + código curto aleatório (`#4F7K2Q`) com índice único |
| Pedido duplicado por clique duplo ou rede instável | `Idempotency-Key` com índice único `(student_id, idempotency_key)` |
| Somente admins gerenciam produtos | RBAC no servidor (`authorize('ADMIN')`) |
| Estudante só vê os próprios pedidos | Filtro imposto no servidor a partir do token; pedido de terceiros responde 404 |
| Fluxo de status coerente | Máquina de estados com `SELECT … FOR UPDATE`; cancelamento devolve o estoque e cancela ou estorna o pagamento |
| Histórico preservado | Produtos vendidos são arquivados (exclusão lógica); toda mudança de status é registrada em `order_status_history` |

---

## Segurança

- **Senhas** com bcrypt (custo 12), política mínima e proteção contra *timing attacks* no login.
- **Sessão:** access token JWT (HS256, 15 min) apenas em memória; refresh token opaco de 256 bits em cookie `httpOnly`, `Secure` (produção), `SameSite=Strict`, restrito a `/api/v1/auth`, armazenado no banco **somente como hash**. O token é rotacionado a cada uso, com detecção de reutilização (revoga a cadeia inteira) e verificação de origem.
- **RBAC** em todas as rotas e validação com **Zod** em todas as entradas (corpo, query, params e headers).
- **SQL Injection:** Prisma e consultas SQL parametrizadas (*tagged templates*).
- **XSS:** React escapa a saída, há sanitização de textos livres, CSP restritiva na API e SVG não é aceito em uploads.
- **Uploads:** tipo validado pela assinatura binária (*magic bytes*), limite de tamanho, nome aleatório, `nosniff`.
- **Helmet** (CSP, HSTS, frameguard), **CORS** por lista de origens permitidas e **rate limiting** (global, login por IP + e-mail, cadastro, pedidos por usuário).
- **Erros** padronizados, sem stack trace e com `requestId` para suporte. Logs estruturados mascaram tokens e cookies.

---

## Testes e verificação

- `npm run typecheck`: TypeScript estrito nos dois apps.
- `npm test`: 24 testes unitários das regras puras: máquina de estados e código do pedido, dinheiro com `Decimal`, fuso horário, assinatura de imagens, redirecionamento seguro após login, formatação e ilustrações de produto. Não precisam de banco.
- `npm run test:e2e`: 114 verificações contra a API real, cobrindo autenticação, RBAC, validação, pedidos, idempotência, concorrência (12 compras simultâneas da última unidade), preço congelado, máquina de estados, devolução de estoque, uploads maliciosos, dashboard, ciclo de vida da sessão e troca de senha.
- As telas foram revisadas com navegador automatizado em desktop e celular (390 px).

---

## Decisões técnicas

- **Sessão do PostgreSQL em UTC:** o adapter `pg` do Prisma envia datas sem offset; se o servidor estiver em outro fuso (instalações no Brasil costumam usar `America/Sao_Paulo`), os horários seriam deslocados. A conexão força `TimeZone=UTC` e o fuso de negócio é aplicado só nos relatórios (`APP_TIMEZONE`).
- **Vite 7 em vez do 8:** no Vite 8.3 (Rolldown), o React era duplicado entre chunks, tanto no dev quanto no build, o que quebrava os hooks. O Vite 7 (Rollup/esbuild) é maduro e gera uma única instância. A migração futura não exige mudanças de código.
- **Watch nativo do Node no desenvolvimento:** a API roda com `node --watch --import tsx`, porque o `tsx watch` trava sob o `concurrently` no Windows. O comportamento é o mesmo, com reinício automático a cada alteração.
- **Polling em vez de WebSocket na v1:** mantém a API stateless e escalável horizontalmente sem infraestrutura extra. O caminho para SSE/WebSocket com Redis pub/sub está descrito na arquitetura.
- **Storage de imagens abstraído:** disco local em desenvolvimento; troca por S3/R2 + CDN sem alterar o restante da aplicação.

---

## Próximos passos

- Redis para rate limit distribuído, cache do cardápio e do dashboard e pub/sub de status em tempo real.
- Storage de objetos + CDN para imagens; fila de jobs (relatórios, notificações, limpeza).
- Testes automatizados de unidade e de componentes no CI.
