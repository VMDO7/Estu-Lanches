import type { ComponentProps } from 'react';
import { formatCurrency } from '@/lib/format';
import { Input } from './Input';

interface CurrencyInputProps extends Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  value: number | null | undefined;
  onValueChange: (value: number) => void;
  invalid?: boolean;
  maxCents?: number;
}

/**
 * Campo monetário estilo "caixa registradora": cada dígito digitado entra pela
 * direita (7 → R$ 0,07 → R$ 0,75 → R$ 7,50). Sem ambiguidade de vírgula/ponto.
 */
export function CurrencyInput({ value, onValueChange, invalid, maxCents = 999_999, ...props }: CurrencyInputProps) {
  const display = value ? formatCurrency(value) : '';

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      invalid={invalid}
      placeholder="R$ 0,00"
      value={display}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, '');
        const cents = Math.min(Number(digits || '0'), maxCents);
        onValueChange(cents / 100);
      }}
      className="tabular-nums"
    />
  );
}
