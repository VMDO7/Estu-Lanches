import { hashPassword } from '../../src/lib/password.js';
import { prisma } from '../../src/lib/prisma.js';
import { passwordField } from '../../src/modules/auth/auth.schemas.js';
import { slugify } from '../../src/shared/text.js';
import { emailField } from '../../src/shared/validation.js';

/** Categorias iniciais do cardápio (dados estruturais, não fictícios). */
const BASE_CATEGORIES = ['Salgados', 'Doces', 'Bebidas', 'Lanches', 'Outros'];

async function seedCategories() {
  if ((await prisma.category.count()) > 0) {
    console.log('• Categorias já existentes — mantidas.');
    return;
  }
  await prisma.category.createMany({
    data: BASE_CATEGORIES.map((name, index) => ({ name, slug: slugify(name), sortOrder: index })),
  });
  console.log(`• ${BASE_CATEGORIES.length} categorias iniciais criadas.`);
}

/** Conta administradora definida exclusivamente por variáveis de ambiente. */
async function seedAdmin() {
  const { SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = process.env;

  if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) {
    console.warn('• SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD não definidos — administrador não criado.');
    return;
  }

  const email = emailField.parse(SEED_ADMIN_EMAIL);
  const passwordCheck = passwordField.safeParse(SEED_ADMIN_PASSWORD);
  if (!passwordCheck.success) {
    throw new Error(
      `SEED_ADMIN_PASSWORD fraca: ${passwordCheck.error.issues.map((issue) => issue.message).join(' ')}`,
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== 'ADMIN') {
      throw new Error(`O e-mail ${email} já pertence a uma conta de estudante.`);
    }
    console.log(`• Administrador ${email} já existe — mantido sem alterações.`);
    return;
  }

  await prisma.user.create({
    data: {
      name: SEED_ADMIN_NAME?.trim() || 'Administrador',
      email,
      passwordHash: await hashPassword(passwordCheck.data),
      role: 'ADMIN',
    },
  });
  console.log(`• Administrador ${email} criado.`);
}

export async function seedBase() {
  await seedCategories();
  await seedAdmin();
}
