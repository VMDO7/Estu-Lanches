import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, GraduationCap, Hash, LockKeyhole, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Field, Input, PasswordInput } from '@/components/ui/Input';
import { PageTitle } from '@/components/ui/PageHeader';
import { PasswordStrength } from '@/features/auth/PasswordStrength';
import { useAuth } from '@/features/auth/useAuth';
import { AuthLayout } from '@/layouts/AuthLayout';
import { getErrorMessage, isApiError } from '@/lib/api-error';
import { firstName } from '@/lib/format';

const registerSchema = z
  .object({
    name: z.string().trim().min(3, 'Informe seu nome completo.').max(120, 'Nome muito longo.'),
    email: z.string().trim().min(1, 'Informe seu e-mail.').pipe(z.email({ error: 'Digite um e-mail válido.' })),
    registration: z
      .string()
      .trim()
      .min(3, 'A matrícula deve ter ao menos 3 caracteres.')
      .max(30, 'Matrícula muito longa.')
      .regex(/^[A-Za-z0-9./-]+$/, 'Use apenas letras, números, ponto, hífen ou barra.'),
    grade: z.string().trim().min(1, 'Informe sua turma.').max(40, 'Turma muito longa.'),
    password: z
      .string()
      .min(8, 'A senha deve ter ao menos 8 caracteres.')
      .max(72, 'A senha é longa demais.')
      .regex(/[A-Za-zÀ-ÿ]/, 'Inclua ao menos uma letra.')
      .regex(/\d/, 'Inclua ao menos um número.'),
    confirmPassword: z.string().min(1, 'Confirme sua senha.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem.',
  });

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { register: createAccount } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', registration: '', grade: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async ({ confirmPassword: _confirm, ...values }: RegisterValues) => {
    setFormError(null);
    try {
      const user = await createAccount(values);
      toast.success(`Conta criada! Bom apetite, ${firstName(user.name)}.`);
      void navigate('/aluno', { replace: true });
    } catch (error) {
      if (isApiError(error)) {
        let mapped = false;
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (messages?.[0] && field in values) {
            setError(field as keyof RegisterValues, { message: messages[0] });
            mapped = true;
          }
        }
        if (mapped) return;
      }
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <AuthLayout
      title="Criar conta de estudante"
      description="Peça seus lanches pelo celular e retire sem fila."
      footer={
        <>
          Já tem uma conta?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800">
            Entrar
          </Link>
        </>
      }
    >
      <PageTitle title="Criar conta" />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {formError}
          </div>
        )}

        <Field label="Nome completo" htmlFor="name" error={errors.name?.message}>
          <Input id="name" autoComplete="name" placeholder="Seu nome" leftIcon={<User />} invalid={!!errors.name} {...register('name')} />
        </Field>

        <Field label="E-mail" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="voce@escola.com.br"
            leftIcon={<Mail />}
            invalid={!!errors.email}
            {...register('email')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Matrícula" htmlFor="registration" error={errors.registration?.message}>
            <Input
              id="registration"
              placeholder="Ex.: 20260123"
              leftIcon={<Hash />}
              autoCapitalize="characters"
              invalid={!!errors.registration}
              {...register('registration')}
            />
          </Field>
          <Field label="Turma" htmlFor="grade" error={errors.grade?.message}>
            <Input id="grade" placeholder="Ex.: 2º ano B" leftIcon={<GraduationCap />} invalid={!!errors.grade} {...register('grade')} />
          </Field>
        </div>

        <Field label="Senha" htmlFor="password" error={errors.password?.message} hint="Mínimo de 8 caracteres, com letras e números.">
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Crie uma senha"
            leftIcon={<LockKeyhole />}
            invalid={!!errors.password}
            {...register('password')}
          />
        </Field>
        <PasswordStrength password={watch('password')} />

        <Field label="Confirmar senha" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Repita a senha"
            leftIcon={<LockKeyhole />}
            invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Criar minha conta
        </Button>
      </form>
    </AuthLayout>
  );
}
