import { cn } from '@/lib/cn';

/** Pontuação simples (0–4) para orientar o usuário — a política real é validada na API. */
export function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  const labels = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  return { score, label: labels[score]! };
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const { score, label } = passwordStrength(password);
  const colors = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-brand-500', 'bg-brand-600'];
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={cn('h-1 flex-1 rounded-full transition-colors', index < Math.max(score, 1) ? colors[score] : 'bg-ink-200')}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-ink-500">Força: {label}</span>
    </div>
  );
}

/** Mesmas regras da API (mín. 8, letra e número, até 72 caracteres). */
export const PASSWORD_RULES = {
  min: 8,
  max: 72,
  letter: /[A-Za-zÀ-ÿ]/,
  digit: /\d/,
} as const;
