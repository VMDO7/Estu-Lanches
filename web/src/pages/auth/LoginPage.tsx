import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, LockKeyhole, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Field, Input, PasswordInput } from '@/components/ui/Input';
import { PageTitle } from '@/components/ui/PageHeader';
import { safeRedirect } from '@/features/auth/auth.api';
import { useAuth } from '@/features/auth/useAuth';
import { AuthLayout } from '@/layouts/AuthLayout';
import { getErrorMessage } from '@/lib/api-error';
import { firstName } from '@/lib/format';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail.').pipe(z.email({ error: 'Digite um e-mail válido.' })),
  password: z.string().min(1, 'Informe sua senha.'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      const user = await login(values);
      toast.success(`Bem-vindo(a), ${firstName(user.name)}!`);
      void navigate(safeRedirect(params.get('redirect'), user.role), { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <AuthLayout
      title="Entrar"
      description="Acesse sua conta para pedir ou gerenciar a cantina."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="font-semibold text-brand-700 hover:text-brand-800">
            Cadastre-se como estudante
          </Link>
        </>
      }
    >
      <PageTitle title="Entrar" />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {formError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {formError}
          </div>
        )}

        <Field label="E-mail" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="voce@escola.com.br"
            leftIcon={<Mail />}
            invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            autoFocus
            {...register('email')}
          />
        </Field>

        <Field label="Senha" htmlFor="password" error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Sua senha"
            leftIcon={<LockKeyhole />}
            invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
}
