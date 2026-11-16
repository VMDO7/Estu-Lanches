import { TriangleAlert, X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

/** Trava o scroll da página enquanto um diálogo modal está aberto. */
function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, [active]);
}

/**
 * Base sobre o <dialog> nativo: camada superior, foco preso no diálogo,
 * ESC para fechar e retorno de foco ao elemento de origem — sem dependências.
 */
function useNativeDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  useScrollLock(open);
  return ref;
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const;

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof sizes;
  /** Impede fechar (ex.: durante o envio de um formulário). */
  locked?: boolean;
}

export function Dialog({ open, onClose, title, description, children, footer, size = 'md', locked }: DialogProps) {
  const ref = useNativeDialog(open);
  const titleId = useId();
  const requestClose = () => {
    if (!locked) onClose();
  };

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) requestClose();
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] overflow-visible rounded-2xl bg-transparent p-0 text-ink-900 shadow-elevated backdrop:bg-transparent',
        sizes[size],
      )}
      aria-labelledby={titleId}
    >
      {open && (
        <div className="flex max-h-[min(90dvh,860px)] flex-col overflow-hidden rounded-2xl bg-white">
          <header className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 pt-5 pb-4">
            <div>
              <h2 id={titleId} className="text-base font-semibold tracking-tight">
                {title}
              </h2>
              {description && <p className="mt-1 text-[13px] text-ink-500">{description}</p>}
            </div>
            <Button variant="ghost" size="icon-sm" onClick={requestClose} aria-label="Fechar" disabled={locked}>
              <X />
            </Button>
          </header>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && (
            <footer className="flex flex-col-reverse gap-2 border-t border-ink-100 bg-ink-25 px-6 py-4 sm:flex-row sm:justify-end">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Voltar',
  tone = 'danger',
  loading,
  children,
}: ConfirmDialogProps) {
  const ref = useNativeDialog(open);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!loading) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-0 text-ink-900 shadow-elevated"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      {open && (
        <div className="p-6">
          <div className="flex gap-4">
            <span
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full',
                tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-700',
              )}
            >
              <TriangleAlert className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-semibold tracking-tight">
                {title}
              </h2>
              <div id={descriptionId} className="mt-1.5 text-sm leading-relaxed text-ink-600">
                {description}
              </div>
              {children && <div className="mt-4">{children}</div>}
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} autoFocus>
              {confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: 'md' | 'lg';
}

/** Painel lateral (carrinho, detalhes do pedido). */
export function Drawer({ open, onClose, title, description, children, footer, width = 'md' }: DrawerProps) {
  const ref = useNativeDialog(open);
  const titleId = useId();

  return (
    <dialog
      ref={ref}
      data-variant="drawer"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        'mt-0 mr-0 mb-0 ml-auto h-dvh max-h-none w-full bg-transparent p-0 text-ink-900',
        width === 'md' ? 'max-w-md' : 'max-w-xl',
      )}
      aria-labelledby={titleId}
    >
      {open && (
        <div className="flex h-full flex-col bg-white shadow-elevated">
          <header className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold tracking-tight">
                {title}
              </h2>
              {description && <div className="mt-0.5 text-[13px] text-ink-500">{description}</div>}
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fechar">
              <X />
            </Button>
          </header>
          <div className="flex-1 overflow-y-auto">{children}</div>
          {footer && <footer className="border-t border-ink-100 bg-white px-5 py-4">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
