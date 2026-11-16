import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Dialog } from '@/components/ui/Dialog';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { isApiError, getErrorMessage } from '@/lib/api-error';
import type { Category, Product } from '@/types/api';
import { ImageUploader } from './ImageUploader';
import { productsApi, useInvalidateCatalog, type ProductInput } from './products.api';

const productSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome (mín. 2 caracteres).').max(80, 'Máximo de 80 caracteres.'),
  description: z.string().trim().max(280, 'Máximo de 280 caracteres.'),
  price: z.number({ error: 'Informe o preço.' }).positive('O preço deve ser maior que zero.').max(9999.99, 'Preço acima do permitido.'),
  categoryId: z.string().min(1, 'Selecione uma categoria.'),
  stock: z
    .number({ error: 'Informe o estoque.' })
    .int('Use um número inteiro.')
    .min(0, 'O estoque não pode ser negativo.')
    .max(100_000, 'Estoque acima do permitido.'),
  isAvailable: z.boolean(),
  image: z.object({ key: z.string(), url: z.string() }).nullable(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  categories: Category[];
}

export function ProductFormDialog({ open, onClose, product, categories }: ProductFormDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={product ? 'Editar produto' : 'Novo produto'}
      description={product ? 'Alterações aparecem imediatamente no cardápio dos estudantes.' : 'Cadastre um item no catálogo da cantina.'}
    >
      {open && <ProductForm key={product?.id ?? 'new'} product={product} categories={categories} onDone={onClose} />}
    </Dialog>
  );
}

function ProductForm({ product, categories, onDone }: { product: Product | null; categories: Category[]; onDone: () => void }) {
  const invalidate = useInvalidateCatalog();
  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? '',
      description: product?.description ?? '',
      price: product?.price ?? 0,
      categoryId: product?.category.id ?? categories.find((category) => category.isActive)?.id ?? '',
      stock: product?.stock ?? 0,
      isAvailable: product?.isAvailable ?? true,
      image: product?.imageKey && product.imageUrl ? { key: product.imageKey, url: product.imageUrl } : null,
    },
  });

  const save = useMutation({
    mutationFn: (values: ProductFormValues) => {
      const input: ProductInput = {
        name: values.name,
        description: values.description,
        price: Math.round(values.price * 100) / 100,
        categoryId: values.categoryId,
        stock: values.stock,
        isAvailable: values.isAvailable,
        imageKey: values.image?.key ?? null,
      };
      return product ? productsApi.update(product.id, input) : productsApi.create(input);
    },
    onSuccess: async (saved) => {
      await invalidate();
      toast.success(product ? `"${saved.name}" atualizado.` : `"${saved.name}" cadastrado no catálogo.`);
      onDone();
    },
    onError: (error) => {
      if (isApiError(error)) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (messages?.[0] && field in productSchema.shape) {
            setError(field as keyof ProductFormValues, { message: messages[0] });
          }
        }
      }
      toast.error(getErrorMessage(error));
    },
  });

  const descriptionLength = watch('description')?.length ?? 0;

  return (
    <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="space-y-5">
      <Controller
        control={control}
        name="image"
        render={({ field }) => <ImageUploader imageUrl={field.value?.url ?? null} onChange={field.onChange} disabled={save.isPending} />}
      />

      <Field label="Nome" htmlFor="product-name" error={errors.name?.message} required>
        <Input id="product-name" placeholder="Ex.: Coxinha de frango" invalid={!!errors.name} {...register('name')} />
      </Field>

      <Field
        label="Descrição"
        htmlFor="product-description"
        error={errors.description?.message}
        aside={<span className="text-xs text-ink-400 tabular-nums">{descriptionLength}/280</span>}
      >
        <Textarea
          id="product-description"
          rows={3}
          placeholder="Ingredientes, tamanho da porção, informações úteis…"
          invalid={!!errors.description}
          {...register('description')}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Categoria" htmlFor="product-category" error={errors.categoryId?.message} required>
          <Select id="product-category" invalid={!!errors.categoryId} {...register('categoryId')}>
            <option value="" disabled>
              Selecione…
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.isActive ? '' : ' (oculta)'}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Preço" htmlFor="product-price" error={errors.price?.message} required>
          <Controller
            control={control}
            name="price"
            render={({ field }) => (
              <CurrencyInput id="product-price" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} invalid={!!errors.price} />
            )}
          />
        </Field>

        <Field label="Estoque" htmlFor="product-stock" error={errors.stock?.message} required>
          <Input
            id="product-stock"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            invalid={!!errors.stock}
            {...register('stock', { valueAsNumber: true })}
          />
        </Field>
      </div>

      <Controller
        control={control}
        name="isAvailable"
        render={({ field }) => (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-ink-200/70 bg-ink-25 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink-900">Disponível no cardápio</p>
              <p className="text-xs text-ink-500">Quando desligado, o produto fica oculto para os estudantes.</p>
            </div>
            <Switch checked={field.value} onCheckedChange={field.onChange} label="Disponível no cardápio" />
          </div>
        )}
      />

      <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-5 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!!product && !isDirty}>
          {product ? 'Salvar alterações' : 'Cadastrar produto'}
        </Button>
      </div>
    </form>
  );
}
