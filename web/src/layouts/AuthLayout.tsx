import { ChefHat, CircleCheck, Clock, PackageCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Logo } from '@/components/brand/Logo';
import { DemoBadge } from '@/features/meta/DemoBadge';

interface AuthLayoutProps {
  title: string;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** Tela dividida: formulário à esquerda, painel de marca à direita (desktop). */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" aria-label="Página inicial do EstuLanches">
            <Logo />
          </Link>
          <DemoBadge />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <div className="animate-slide-up">
            <h1 className="text-[28px] font-semibold tracking-tight text-ink-950">{title}</h1>
            <p className="mt-2 text-[15px] text-ink-500">{description}</p>
          </div>
          <div className="mt-8 animate-slide-up [animation-delay:80ms]">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-ink-500">{footer}</div>}
        </div>

        <p className="text-center text-xs text-ink-400 lg:text-left">© {new Date().getFullYear()} EstuLanches · Cantina escolar sem fila</p>
      </div>

      <BrandPanel />
    </div>
  );
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-ink-950 lg:block" aria-hidden>
      <div className="bg-dots absolute inset-0" />
      <div className="absolute -top-40 -right-32 size-[560px] rounded-full bg-brand-500/25 blur-[120px]" />
      <div className="absolute -bottom-48 -left-24 size-[420px] rounded-full bg-accent-500/15 blur-[120px]" />

      <div className="relative flex h-full flex-col justify-between p-14">
        <div className="max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-brand-300 ring-1 ring-white/10">
            <span className="size-1.5 rounded-full bg-brand-400" />
            Pedidos antecipados para o intervalo
          </span>
          <h2 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-white">
            O intervalo é curto.
            <br />
            <span className="bg-linear-to-r from-brand-300 to-amber-200 bg-clip-text text-transparent">A fila não precisa ser.</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-300">
            Peça pelo celular, acompanhe o preparo em tempo real e retire no balcão quando estiver pronto.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="animate-float rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold text-white">#4F7K2Q</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-400/15 px-2.5 py-1 text-xs font-medium text-brand-300">
                <PackageCheck className="size-3.5" />
                Pronto para retirada
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {[
                { icon: CircleCheck, label: 'Pedido recebido', done: true },
                { icon: ChefHat, label: 'Em preparação', done: true },
                { icon: PackageCheck, label: 'Pronto — pode buscar!', done: true },
              ].map((step) => (
                <div key={step.label} className="flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-full bg-brand-500 text-white">
                    <step.icon className="size-3.5" />
                  </span>
                  <span className="text-sm text-ink-200">{step.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -right-6 -bottom-10 flex items-center gap-3 rounded-xl border border-white/10 bg-ink-900/90 px-4 py-3 shadow-2xl backdrop-blur-xl [animation-delay:1.5s] animate-float">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent-500/15 text-accent-300">
              <Clock className="size-4" />
            </span>
            <div>
              <p className="text-xs text-ink-400">Retirada</p>
              <p className="text-sm font-medium text-white">Sem fila, no seu tempo</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
