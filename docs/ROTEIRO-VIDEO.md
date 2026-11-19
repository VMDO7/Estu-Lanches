# Roteiro de gravação: apresentação do código do EstuLanches

Duração sugerida: **15 a 18 minutos**. Cada bloco traz **o que abrir**, **o que mostrar na tela** e **o que falar** (sugestão de fala, adapte com suas palavras).

> **Antes de gravar**
> - Rode `npm run dev` e deixe **http://localhost:5173** aberto numa aba do navegador.
> - No VS Code, feche os arquivos abertos e deixe o explorador de arquivos visível.
> - Aumente a fonte do editor (Ctrl + `+`) para ficar legível no vídeo.
> - Os números de linha são aproximados. Use **Ctrl + P** para abrir arquivos e **Ctrl + G** para ir até uma linha.
> - Logins: admin `admin@gmail.com` / `admin@18` · aluno `ana.souza@estulanches.test` (senha `SEED_DEMO_PASSWORD` do `server/.env`).

---

## 1. Abertura e demonstração rápida (2 min)

**Mostrar:** o navegador.

1. **Landing page** (`/`): role a página até o fim.
2. **Login como aluno:** cardápio, adicionar 2 itens, abrir o carrinho, finalizar com PIX, tela "Pedido confirmado" com o código.
3. **Login como admin** (outra janela anônima): dashboard, depois **Pedidos → Quadro**. Clique em "Iniciar preparo" no pedido que acabou de fazer e mostre que, na tela do aluno, o status muda sozinho.

**Fala:**
> "O EstuLanches é um sistema de cantina escolar com dois ambientes: o aluno faz o pedido pelo celular e a cantina acompanha tudo em um painel. Os dois usam a mesma API e o mesmo banco PostgreSQL. Agora vou mostrar como isso foi construído por dentro."

---

## 2. Visão geral do projeto (1,5 min)

**Abrir:** a raiz do projeto no explorador e o arquivo `package.json`.

**Mostrar:**
- As pastas `server/` (API), `web/` (site) e `docs/` (documentação).
- No `package.json`: `workspaces` e os scripts `dev`, `build`, `test`, `setup`.

**Fala:**
> "É um monorepo com npm workspaces: o back-end fica em `server` e o front-end em `web`. Um único `npm run dev` sobe os dois. A documentação de arquitetura está em `docs/ARQUITETURA.md`, com diagramas e o plano de escalabilidade."

---

## 3. Banco de dados (2,5 min)

### 3.1 Modelo: `server/prisma/schema.prisma`
**Mostrar:** os enums (linhas ~22–47) e os models `User`, `Student`, `Product`, `Order`, `OrderItem`, `Payment` e `OrderStatusHistory` (linhas ~49–230).

**Destaque:**
- `OrderItem` guarda `productName` e `unitPrice`: é o **preço no momento da compra**.
- `Product.archivedAt`: exclusão lógica (produto vendido não é apagado).
- `Order.idempotencyKey` com `@@unique([studentId, idempotencyKey])`.
- IDs `uuid(7)` e datas `Timestamptz`.

**Fala:**
> "Se a cantina mudar o preço da coxinha amanhã, o pedido de hoje continua com o preço antigo, porque o item guarda uma cópia do preço da venda."

### 3.2 Migration: `server/prisma/migrations/…_init/migration.sql`
**Mostrar:** o final do arquivo (linha ~240), com as `CHECK constraints`.

**Fala:**
> "Além da aplicação, o próprio banco protege os dados: o estoque nunca pode ficar negativo e o preço precisa ser maior que zero. Mesmo se houver um bug no código, o PostgreSQL recusa."

---

## 4. Arquitetura da API (2 min)

### 4.1 `server/src/app.ts`
**Mostrar:** a sequência de `app.use` (linhas ~26–65): logger, `helmet`, `cors`, `/health`, `/uploads` e `/api/v1` com rate limit; tratamento de erros no fim.

**Fala:**
> "Aqui a API é montada: segurança com Helmet, CORS só para origens permitidas, limite de requisições e, no fim, um tratador de erros que nunca expõe detalhes internos."

### 4.2 Um módulo completo: `server/src/modules/products/`
**Mostrar:** os arquivos `products.routes.ts` → `products.controller.ts` → `products.service.ts` → `products.repository.ts`.

**Fala:**
> "Cada módulo segue camadas: a **rota** define URL e permissão, o **controller** valida a entrada com Zod, o **service** aplica as regras de negócio e o **repository** conversa com o banco. Fica fácil de testar e de manter."

### 4.3 Validação de ambiente: `server/src/config/env.ts`
**Fala:**
> "Nenhuma senha fica no código. Tudo vem do `.env`, que é validado quando a API sobe; se faltar algo, ela nem inicia."

---

## 5. O ponto mais importante: o pedido e a concorrência (3 min)

### 5.1 `server/src/modules/orders/orders.service.ts`, função `create` (linha ~136)
**Mostrar, em ordem:**
1. A checagem de idempotência (pedido repetido devolve o mesmo pedido).
2. `findCartIssues` (linha ~152): lista todos os problemas do carrinho de uma vez.
3. A `prisma.$transaction` (linha ~160) com `ReadCommitted` (linha ~187).

### 5.2 `server/src/modules/orders/orders.repository.ts`, função `reserveStock` (linha ~86)
**Mostrar:** o SQL `UPDATE products … WHERE stock >= quantidade RETURNING name, price`.

**Fala:**
> "Esse é o coração do sistema. Se dois alunos tentarem comprar a última coxinha ao mesmo tempo, o PostgreSQL trava a linha do produto e só um `UPDATE` encontra estoque suficiente; o outro recebe zero linhas e o pedido é recusado. No mesmo comando eu já pego o preço, que vira a cópia gravada no item. Testei com 12 compras simultâneas da última unidade: exatamente uma foi aprovada."

### 5.3 `server/src/modules/orders/order-status.ts` (linha ~18)
**Mostrar:** o objeto `TRANSITIONS`.

**Fala:**
> "O status segue uma máquina de estados: só dá para avançar na ordem certa ou cancelar. Quando cancela, o estoque volta automaticamente (`restoreStock`)."

---

## 6. Segurança e login (2 min)

### 6.1 `server/src/modules/auth/auth.service.ts`
**Mostrar:** `login` (senha com bcrypt), `refresh` (linha ~130) e `ROTATION_GRACE_MS` (linha ~15).

**Fala:**
> "As senhas são guardadas com bcrypt. O login gera um token curto, de 15 minutos, que fica só na memória do navegador, e um token de renovação num cookie protegido, que o JavaScript não consegue ler. A cada renovação esse token é trocado; se alguém tentar reaproveitar um token antigo, o sistema derruba a sessão inteira por segurança."

### 6.2 `server/src/middlewares/authenticate.ts` e `authorize.ts`
**Fala:**
> "Toda rota protegida passa por aqui: `authenticate` confere o token e `authorize('ADMIN')` garante que só o administrador mexe no catálogo. E o aluno só enxerga os próprios pedidos: o filtro é aplicado no servidor."

### 6.3 `server/src/modules/uploads/image-signature.ts`
**Fala:**
> "No upload de imagem eu não confio na extensão do arquivo: leio os primeiros bytes para confirmar que é mesmo JPG, PNG ou WEBP. Um script disfarçado de imagem é recusado."

---

## 7. Front-end (2,5 min)

### 7.1 Estrutura de `web/src/`
**Mostrar:** as pastas `components/ui` (design system próprio), `features` (lógica por assunto), `pages` e `layouts`.

### 7.2 `web/src/styles/globals.css` (linha ~8, `@theme`)
**Fala:**
> "A identidade visual fica centralizada em tokens: o verde da marca, o laranja de destaque e os neutros. As cores dos gráficos foram validadas para contraste e daltonismo."

### 7.3 `web/src/lib/api-client.ts`
**Mostrar:** `refreshSession` (linha ~41) e o trecho do `401` (linha ~96).

**Fala:**
> "Quando o token expira, o cliente renova a sessão sozinho e repete a requisição. O usuário nem percebe."

### 7.4 Carrinho: `web/src/features/cart/useCart.ts` (`useCartReview`, linha ~35)
**Fala:**
> "O carrinho compara o que está salvo com o cardápio atual e avisa se algo esgotou ou mudou de preço antes de finalizar."

### 7.5 Checkout: `web/src/pages/student/CheckoutPage.tsx` (linha ~35)
**Fala:**
> "Cada compra gera uma chave única; se o aluno clicar duas vezes em 'Confirmar', o servidor reconhece a chave e não cria um pedido duplicado."

### 7.6 Dashboard: `web/src/pages/admin/DashboardPage.tsx`
**Mostrar:** rapidamente a tela no navegador e o botão de **ver em tabela** em um gráfico.

**Fala:**
> "Os números do dashboard são calculados direto no PostgreSQL, com o fuso de São Paulo, e cada gráfico tem uma versão em tabela, para acessibilidade."

---

## 8. Testes (1,5 min)

**Mostrar no terminal:**
```
npm test
npm run test:e2e
```
(o E2E exige a API rodando; depois rode `npm run db:seed:demo -- --reset` para restaurar os dados)

**Mostrar:** `server/src/modules/orders/orders.domain.test.ts` e o arquivo `server/scripts/e2e-smoke.mjs`, na seção `[7] Concorrência`.

**Fala:**
> "São 24 testes unitários das regras de negócio e 114 verificações ponta a ponta contra a API real, incluindo o teste das compras simultâneas, a idempotência, as permissões e a troca de senha."

---

## 9. Encerramento (1 min)

**Mostrar:** `docs/ARQUITETURA.md`, na seção 9 (Escalabilidade).

**Fala:**
> "A API não guarda estado em memória, então dá para rodar várias instâncias atrás de um balanceador. O plano para crescer até 100 mil usuários simultâneos está documentado: Redis para cache e limite de requisições, armazenamento de imagens em nuvem com CDN, filas e WebSocket para atualização em tempo real. A próxima etapa é empacotar tudo com Docker. Obrigado!"

---

### Checklist rápido

| # | Bloco | Arquivo principal | Tempo |
|---|---|---|---|
| 1 | Demonstração | navegador | 2:00 |
| 2 | Estrutura | `package.json` | 1:30 |
| 3 | Banco | `schema.prisma`, `migration.sql` | 2:30 |
| 4 | API | `app.ts`, `modules/products/` | 2:00 |
| 5 | Pedido e concorrência | `orders.service.ts`, `orders.repository.ts` | 3:00 |
| 6 | Segurança | `auth.service.ts`, middlewares, `image-signature.ts` | 2:00 |
| 7 | Front-end | `api-client.ts`, `useCart.ts`, `CheckoutPage.tsx` | 2:30 |
| 8 | Testes | terminal | 1:30 |
| 9 | Encerramento | `ARQUITETURA.md` | 1:00 |
