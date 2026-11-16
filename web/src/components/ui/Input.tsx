import { CircleAlert, Eye, EyeOff } from 'lucide-react';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

const controlBase =
  'w-full rounded-lg border border-ink-200 bg-white text-sm text-ink-900 shadow-xs transition-[border-color,box-shadow] duration-150 ' +
  'placeholder:text-ink-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400';

const invalidStyles = 'border-red-400 focus:border-red-500 focus:ring-red-500/15';

interface InputProps extends ComponentProps<'input'> {
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  invalid?: boolean;
}

export function Input({ className, leftIcon, rightSlot, invalid, ...props }: InputProps) {
  return (
    <div className="relative">
      {leftIcon && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-400 [&_svg]:size-4">
          {leftIcon}
        </span>
      )}
      <input
        className={cn(controlBase, 'h-10 px-3', leftIcon && 'pl-9', rightSlot && 'pr-11', invalid && invalidStyles, className)}
        aria-invalid={invalid || undefined}
        {...props}
      />
      {rightSlot && <span className="absolute inset-y-0 right-1 flex items-center">{rightSlot}</span>}
    </div>
  );
}

export function PasswordInput(props: Omit<InputProps, 'type' | 'rightSlot'>) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      rightSlot={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="flex size-8 items-center justify-center rounded-md text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
    />
  );
}

interface TextareaProps extends ComponentProps<'textarea'> {
  invalid?: boolean;
}

export function Textarea({ className, invalid, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(controlBase, 'min-h-20 resize-y px-3 py-2.5 leading-relaxed', invalid && invalidStyles, className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
  aside?: ReactNode;
}

/** Rótulo + controle + mensagem de erro/ajuda, com associação acessível. */
export function Field({ label, htmlFor, error, hint, required, className, children, aside }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || aside) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-700">
              {label}
              {required && <span className="ml-0.5 text-red-500">*</span>}
            </label>
          )}
          {aside}
        </div>
      )}
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="flex items-center gap-1.5 text-xs font-medium text-red-600">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}
