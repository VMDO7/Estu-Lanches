import { Prisma } from '../../generated/prisma/client.js';
import { imageStorage } from '../../lib/storage.js';
import { conflict, notFound, unprocessable } from '../../shared/errors.js';
import { paginate, type Paginated } from '../../shared/pagination.js';
import { toProductDto, type ProductDto } from './products.mapper.js';
import { productsRepository } from './products.repository.js';
import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from './products.schemas.js';

async function getOrThrow(id: string) {
  const product = await productsRepository.findActiveById(id);
  if (!product) throw notFound('Produto não encontrado.');
  return product;
}

async function ensureCategory(categoryId: string) {
  if (!(await productsRepository.categoryExists(categoryId))) {
    throw unprocessable('A categoria selecionada não existe.', undefined, 'INVALID_CATEGORY');
  }
}

async function ensureUniqueName(name: string, excludeId?: string) {
  if (await productsRepository.findDuplicateName(name, excludeId)) {
    throw conflict('Já existe um produto com esse nome.', { fieldErrors: { name: ['Nome já utilizado.'] } }, 'PRODUCT_EXISTS');
  }
}

async function ensureImage(imageKey: string) {
  if (!(await imageStorage.exists(imageKey))) {
    throw unprocessable('Imagem não encontrada. Envie a imagem novamente.', undefined, 'IMAGE_NOT_FOUND');
  }
}

function isForeignKeyViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
}

export const productsService = {
  async list(query: ListProductsQuery): Promise<Paginated<ProductDto>> {
    const { items, total } = await productsRepository.list(query);
    return paginate(items.map(toProductDto), total, query);
  },

  async get(id: string): Promise<ProductDto> {
    return toProductDto(await getOrThrow(id));
  },

  async create(input: CreateProductInput): Promise<ProductDto> {
    await Promise.all([ensureCategory(input.categoryId), ensureUniqueName(input.name)]);
    if (input.imageKey) await ensureImage(input.imageKey);

    const product = await productsRepository.create({
      name: input.name,
      description: input.description ?? '',
      price: new Prisma.Decimal(input.price),
      stock: input.stock,
      isAvailable: input.isAvailable ?? true,
      categoryId: input.categoryId,
      imageKey: input.imageKey ?? null,
    });
    return toProductDto(product);
  },

  async update(id: string, input: UpdateProductInput): Promise<ProductDto> {
    const current = await getOrThrow(id);

    if (input.categoryId && input.categoryId !== current.categoryId) {
      await ensureCategory(input.categoryId);
    }
    if (input.name && input.name.toLocaleLowerCase('pt-BR') !== current.name.toLocaleLowerCase('pt-BR')) {
      await ensureUniqueName(input.name, id);
    }
    if (input.imageKey && input.imageKey !== current.imageKey) {
      await ensureImage(input.imageKey);
    }

    const updated = await productsRepository.update(id, {
      name: input.name,
      description: input.description,
      price: input.price === undefined ? undefined : new Prisma.Decimal(input.price),
      stock: input.stock,
      isAvailable: input.isAvailable,
      categoryId: input.categoryId,
      imageKey: input.imageKey,
    });

    // Imagem substituída/removida: apaga o arquivo antigo após o commit.
    if (input.imageKey !== undefined && current.imageKey && current.imageKey !== input.imageKey) {
      await imageStorage.remove(current.imageKey);
    }

    return toProductDto(updated);
  },

  /**
   * Produto sem vendas é excluído de fato; com histórico, é arquivado para
   * preservar os pedidos. A tentativa de exclusão física decide de forma
   * atômica (a FK de order_items impede apagar produtos já vendidos).
   */
  async remove(id: string): Promise<{ archived: boolean }> {
    const product = await getOrThrow(id);
    try {
      await productsRepository.hardDelete(id);
      if (product.imageKey) await imageStorage.remove(product.imageKey);
      return { archived: false };
    } catch (error) {
      if (!isForeignKeyViolation(error)) throw error;
      await productsRepository.archive(id);
      return { archived: true };
    }
  },

  async adjustStock(id: string, delta: number): Promise<ProductDto> {
    const stock = await productsRepository.adjustStock(id, delta);
    if (stock === null) {
      await getOrThrow(id);
      throw unprocessable('O ajuste deixaria o estoque negativo.', undefined, 'NEGATIVE_STOCK');
    }
    return toProductDto(await getOrThrow(id));
  },
};
