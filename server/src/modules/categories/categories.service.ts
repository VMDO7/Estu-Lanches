import { badRequest, conflict, notFound } from '../../shared/errors.js';
import { slugify } from '../../shared/text.js';
import { categoriesRepository, type CategoryWithCount } from './categories.repository.js';
import type { CreateCategoryInput, UpdateCategoryInput } from './categories.schemas.js';

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

function toCategoryDto(category: CategoryWithCount): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    productCount: category._count.products,
  };
}

async function ensureAvailableName(name: string, excludeId?: string) {
  const slug = slugify(name);
  if (!slug) throw badRequest('Nome de categoria inválido.');
  if (await categoriesRepository.findConflicting(name, slug, excludeId)) {
    throw conflict('Já existe uma categoria com esse nome.', undefined, 'CATEGORY_EXISTS');
  }
  return slug;
}

async function getOrThrow(id: string) {
  const category = await categoriesRepository.findById(id);
  if (!category) throw notFound('Categoria não encontrada.');
  return category;
}

export const categoriesService = {
  async list(includeInactive: boolean): Promise<CategoryDto[]> {
    const categories = await categoriesRepository.list(includeInactive);
    return categories.map(toCategoryDto);
  },

  async create(input: CreateCategoryInput): Promise<CategoryDto> {
    const slug = await ensureAvailableName(input.name);
    const category = await categoriesRepository.create({
      name: input.name,
      slug,
      isActive: input.isActive ?? true,
      sortOrder: await categoriesRepository.nextSortOrder(),
    });
    return toCategoryDto(category);
  },

  async update(id: string, input: UpdateCategoryInput): Promise<CategoryDto> {
    const current = await getOrThrow(id);
    const renaming = input.name !== undefined && input.name !== current.name;
    const slug = renaming && input.name ? await ensureAvailableName(input.name, id) : undefined;

    const category = await categoriesRepository.update(id, {
      ...(renaming && { name: input.name, slug }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    });
    return toCategoryDto(category);
  },

  async remove(id: string): Promise<void> {
    await getOrThrow(id);
    if ((await categoriesRepository.countAllProducts(id)) > 0) {
      throw conflict(
        'Esta categoria possui produtos vinculados. Mova os produtos ou desative a categoria.',
        undefined,
        'CATEGORY_IN_USE',
      );
    }
    await categoriesRepository.delete(id);
  },

  /** Recebe a lista completa de IDs na nova ordem de exibição. */
  async reorder(orderedIds: string[]): Promise<CategoryDto[]> {
    const existing = await categoriesRepository.allIds();
    const unique = new Set(orderedIds);
    const isPermutation =
      unique.size === orderedIds.length &&
      orderedIds.length === existing.length &&
      existing.every((id) => unique.has(id));

    if (!isPermutation) {
      throw badRequest('A nova ordem deve conter todas as categorias, sem repetições.');
    }

    await categoriesRepository.reorder(orderedIds);
    return this.list(true);
  },
};
