import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { GraduationCap, Hash, KeyRound, LockKeyhole, Mail, ShieldCheck, User, UserRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Field, Input, PasswordInput } from '@/components/ui/Input';
import { PageHeader, PageTitle } from '@/components/ui/PageHeader';
import { authApi } from '@/features/auth/auth.api';
import { PASSWORD_RULES, PasswordStrength } from '@/features/auth/PasswordStrength';
import { useAuth } from '@/features/auth/useAuth';
import { getErrorMessage, isApiError } from '@/lib/api-error';
import type { AuthUser } from '@/types/api';

const profileSchema = z.object({
  name: z.string().trim().min(3, 'Informe seu nome completo.').max(120, 'Nome muito longo.'),
  grade: z.string().trim().max(40, 'Turma muito longa.'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: z
      .string()
      .min(PASSWORD_RULES.min, `A senha deve ter ao menos ${PASSWORD_RULES.min} caracteres.`)
      .max(PASSWORD_RULES.max, 'A senha é longa demais.')
      .regex(PASSWORD_RULES.letter, 'Inclua ao menos uma letra.')
      .regex(PASSWORD_RULES.digit, 'Inclua ao menos um número.'),
    confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem.',
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha deve ser diferente da atual.',
  });

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

/** "Minha conta" — compartilhada entre estudantes e administradores. */
export function AccountPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Minha conta" />
      <PageHeader title="Minha conta" description="Seus dados de acesso e a segurança da sua conta." />
      <div className="space-y-6">
        <ProfileCard key={`${user.id}-${user.name}-${user.student?.grade ?? ''}`} user={user} />
        <PasswordCard />
      </div>
    </div>
  );
}

function ProfileCard({ user }: { user: AuthUser }) {
  const { updateUser } = useAuth();
  const isStudent = user.role === 'STUDENT' && !!user.student;

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(isStudent ? profileSchema.extend({ grade: z.string().trim().min(1, 'Informe sua turma.').max(40, 'Turma muito longa.') }) : profileSchema),
    defaultValues: { name: user.name, grade: user.student?.grade ?? '' },
  });

  const save = useMutation({
    mutationFn: (values: ProfileValues) =>
      authApi.updateProfile({ name: values.name, ...(isStudent && { grade: values.grade }) }),
    onSuccess: (updated) => {
      updateUser(updated);
      reset({ name: updated.name, grade: updated.student?.grade ?? '' });
      toast.success('Perfil atualizado.');
    },
    onError: (error) => {
      if (isApiError(error)) {
        for (const field of ['name', 'grade'] as const) {
          const message = error.fieldErrors[field]?.[0];
          if (message) setError(field, { message });
        }
      }
      toast.error(getErrorMessage(error));
    },
  });

  return (
    <Card>
      <CardHeader title="Perfil" description="Como você aparece para a cantina." icon={<UserRound />} />
      <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="space-y-5 p-5">
        <div className="flex items-center gap-4 rounded-xl bg-ink-25 p-4 ring-1 ring-ink-200/60">
          <Avatar name={user.name} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-950">{user.name}</p>
            <p className="truncate text-[13px] text-ink-500">{user.email}</p>
            <Badge tone={user.role === 'ADMIN' ? 'brand' : 'neutral'} className="mt-1.5">
              {user.role === 'ADMIN' ? 'Administrador' : 'Estudante'}
            </Badge>
          </div>
        </div>

        <Field label="Nome completo" htmlFor="account-name" error={errors.name?.message}>
          <Input id="account-name" autoComplete="name" leftIcon={<User />} invalid={!!errors.name} {...register('name')} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="E-mail"
            htmlFor="account-email"
            hint={isStudent ? 'Para alterar o e-mail, procure a administração da cantina.' : 'O e-mail é o identificador de acesso da conta.'}
          >
            <Input id="account-email" value={user.email} leftIcon={<Mail />} disabled readOnly />
          </Field>
          {isStudent && (
            <Field label="Matrícula" htmlFor="account-registration">
              <Input id="account-registration" value={user.student!.registration} leftIcon={<Hash />} disabled readOnly />
            </Field>
          )}
        </div>

        {isStudent && (
          <Field label="Turma" htmlFor="account-grade" error={errors.grade?.message}>
            <Input id="account-grade" leftIcon={<GraduationCap />} invalid={!!errors.grade} {...register('grade')} />
          </Field>
        )}

        <div className="flex justify-end border-t border-ink-100 pt-5">
          <Button type="submit" loading={save.isPending} disabled={!isDirty}>
            Salvar alterações
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const change = useMutation({
    mutationFn: ({ currentPassword, newPassword }: PasswordValues) => authApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      reset();
      toast.success('Senha alterada. Sessões em outros dispositivos foram encerradas.');
    },
    onError: (error) => {
      if (isApiError(error)) {
        const current = error.fieldErrors.currentPassword?.[0];
        const next = error.fieldErrors.newPassword?.[0];
        if (current) setError('currentPassword', { message: current });
        if (next) setError('newPassword', { message: next });
        if (current || next) return;
      }
      toast.error(getErrorMessage(error));
    },
  });

  return (
    <Card>
      <CardHeader title="Segurança" description="Troque sua senha periodicamente." icon={<ShieldCheck />} />
      <form onSubmit={handleSubmit((values) => change.mutate(values))} noValidate className="space-y-5 p-5">
        <Field label="Senha atual" htmlFor="current-password" error={errors.currentPassword?.message}>
          <PasswordInput
            id="current-password"
            autoComplete="current-password"
            leftIcon={<LockKeyhole />}
            invalid={!!errors.currentPassword}
            {...register('currentPassword')}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Nova senha"
            htmlFor="new-password"
            error={errors.newPassword?.message}
            hint="Mínimo de 8 caracteres, com letras e números."
          >
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              leftIcon={<KeyRound />}
              invalid={!!errors.newPassword}
              {...register('newPassword')}
            />
          </Field>
          <Field label="Confirmar nova senha" htmlFor="confirm-password" error={errors.confirmPassword?.message}>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              leftIcon={<KeyRound />}
              invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
          </Field>
        </div>
        <PasswordStrength password={watch('newPassword')} />
        <div className="flex flex-col-reverse items-start gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-500">Ao trocar a senha, você continua conectado neste dispositivo.</p>
          <Button type="submit" loading={change.isPending}>
            Alterar senha
          </Button>
        </div>
      </form>
    </Card>
  );
}
