import {
  ArrowRight,
  Banknote,
  ChartColumn,
  ChefHat,
  CircleCheck,
  ClipboardList,
  Clock,
  Layers,
  LockKeyhole,
  PackageCheck,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Logo, LogoMark } from '@/components/brand/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { PageTitle } from '@/components/ui/PageHeader';
import { homePathFor } from '@/features/auth/auth.api';
import { useAuth } from '@/features/auth/useAuth';
import { ProductImage } from '@/features/products/ProductImage';
import { cn } from '@/lib/cn';

const NAV_LINKS = [
  { href: '#funcionalidades', label: 'Funcionalidades' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#cantina', label: 'Para a cantina' },
];

function useScrolled(threshold = 16) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

export function LandingPage() {
  const { user } = useAuth();
  const scrolled = useScrolled();
  const appHref = user ? homePathFor(user.role) : '/login';

  return (
    <div className="min-h-dvh overflow-x-clip bg-white">
      <PageTitle title="Cantina escolar sem fila" />

      {/* Cabeçalho */}
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-40 transition-all duration-300',
          scrolled ? 'border-b border-ink-200/70 bg-white/85 backdrop-blur-xl' : 'bg-transparent',
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5 sm:px-6">
          <Link to="/" aria-label="EstuLanches">
            <Logo tone={scrolled ? 'dark' : 'light'} />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Seções">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  scrolled ? 'text-ink-600 hover:text-ink-950' : 'text-ink-300 hover:text-white',
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <ButtonLink to={appHref} size="sm" rightIcon={<ArrowRight />}>
                {user.role === 'ADMIN' ? 'Abrir painel' : 'Ir para o cardápio'}
              </ButtonLink>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cn(
                    'hidden rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:inline-flex',
                    scrolled ? 'text-ink-700 hover:text-ink-950' : 'text-ink-200 hover:text-white',
                  )}
                >
                  Entrar
                </Link>
                <ButtonLink to="/cadastro" size="sm">
                  Criar conta
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <Hero appHref={appHref} isAuthenticated={!!user} />
        <ValueStrip />
        <Features />
        <HowItWorks />
        <ForCanteens />
        <TrustSection />
        <FinalCta isAuthenticated={!!user} appHref={appHref} />
      </main>

      <Footer />
    </div>
  );
}

function Hero({ appHref, isAuthenticated }: { appHref: string; isAuthenticated: boolean }) {
  return (
    <section className="relative overflow-hidden bg-ink-950 pt-32 pb-24 sm:pt-36 lg:pb-32">
      <div className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" aria-hidden />
      <div className="absolute top-[-20%] left-1/2 size-[900px] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[140px]" aria-hidden />
      <div className="absolute right-[-10%] bottom-[-30%] size-[500px] rounded-full bg-accent-500/10 blur-[120px]" aria-hidden />

      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-5 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="animate-slide-up text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-brand-300 ring-1 ring-white/10 backdrop-blur">
            <Sparkles className="size-3.5" aria-hidden />
            Pedidos antecipados para o intervalo
          </span>
          <h1 className="mt-6 text-[40px] leading-[1.05] font-semibold tracking-[-0.03em] text-white sm:text-6xl lg:text-[52px] xl:text-[56px]">
            <span className="block text-balance">O intervalo é curto.</span>
            <span className="block bg-linear-to-r from-brand-300 via-brand-400 to-amber-200 bg-clip-text text-balance text-transparent">
              A fila não precisa ser.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-300 sm:text-lg lg:mx-0">
            O EstuLanches conecta estudantes e cantina: o aluno pede pelo celular, paga como preferir e retira na hora
            certa. A equipe acompanha pedidos, estoque e vendas em tempo real.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <ButtonLink to={isAuthenticated ? appHref : '/cadastro'} size="lg" rightIcon={<ArrowRight />} className="w-full sm:w-auto">
              {isAuthenticated ? 'Continuar' : 'Fazer meu pedido'}
            </ButtonLink>
            <ButtonLink
              to={isAuthenticated ? appHref : '/login'}
              size="lg"
              variant="secondary"
              className="w-full bg-white/5 text-white ring-white/15 hover:bg-white/10 hover:ring-white/25 sm:w-auto"
            >
              Acessar painel da cantina
            </ButtonLink>
          </div>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-400 lg:justify-start">
            {['Sem instalar nada', 'Funciona no celular', 'Pagamento flexível'].map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5">
                <CircleCheck className="size-4 text-brand-400" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

/** Ilustração do produto montada em HTML (não é um print de dados reais). */
function HeroVisual() {
  const items = [
    { name: 'Coxinha de frango', price: 'R$ 6,50', slug: 'salgados' },
    { name: 'Suco natural de laranja', price: 'R$ 6,00', slug: 'bebidas' },
    { name: 'Misto quente', price: 'R$ 8,00', slug: 'lanches' },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[420px] animate-slide-up [animation-delay:120ms]" aria-hidden>
      <div className="absolute inset-x-10 -inset-y-6 rounded-[48px] bg-brand-500/20 blur-3xl" />
      {/* Celular */}
      <div className="relative mx-auto w-[290px] rounded-[44px] border border-white/10 bg-ink-900 p-3 shadow-[0_40px_80px_-20px_rgb(0_0_0/0.6)]">
        <div className="overflow-hidden rounded-[34px] bg-ink-25">
          <div className="flex items-center justify-between bg-white px-5 pt-4 pb-3">
            <LogoMark className="size-7" />
            <span className="flex h-7 items-center gap-1.5 rounded-lg bg-ink-900 px-2.5 text-[11px] font-medium text-white">
              <ShoppingBag className="size-3.5" /> 2
            </span>
          </div>
          <div className="px-5 pt-3 pb-2">
            <p className="text-[11px] text-ink-500">Bom dia, Ana</p>
            <p className="text-[15px] font-semibold tracking-tight text-ink-950">O que vai ser hoje?</p>
            <div className="mt-3 flex gap-1.5">
              {['Tudo', 'Salgados', 'Bebidas'].map((chip, index) => (
                <span
                  key={chip}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[10px] font-medium',
                    index === 0 ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 ring-1 ring-ink-200',
                  )}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-2 px-4 pt-1 pb-5">
            {items.map((item) => (
              <div key={item.name} className="flex items-center gap-3 rounded-2xl bg-white p-2 shadow-card ring-1 ring-ink-200/60">
                <div className="size-12 overflow-hidden rounded-xl">
                  <ProductImage src={null} name={item.name} categorySlug={item.slug} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-ink-900">{item.name}</p>
                  <p className="text-[11px] text-ink-500">{item.price}</p>
                </div>
                <span className="flex size-7 items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white">+</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cartões flutuantes */}
      <div className="absolute -bottom-6 -left-2 animate-float rounded-2xl border border-white/10 bg-white p-3.5 shadow-elevated sm:-left-10 lg:-left-14">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <PackageCheck className="size-[18px]" />
          </span>
          <div>
            <p className="text-[11px] text-ink-500">Pedido #4F7K2Q</p>
            <p className="text-[13px] font-semibold text-ink-900">Pronto para retirada</p>
          </div>
        </div>
      </div>
      <div className="absolute top-24 -right-2 animate-float rounded-2xl border border-white/10 bg-white p-3.5 shadow-elevated [animation-delay:2s] sm:-right-10 lg:-right-14">
        <p className="text-[11px] font-medium text-ink-500">Pagamento</p>
        <div className="mt-2 flex gap-1.5">
          {[QrCode, Banknote, Store].map((Icon, index) => (
            <span
              key={index}
              className={cn(
                'flex size-8 items-center justify-center rounded-lg',
                index === 0 ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500',
              )}
            >
              <Icon className="size-4" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ValueStrip() {
  const values: Array<{ icon: LucideIcon; title: string; text: string }> = [
    { icon: Zap, title: 'Pedido em segundos', text: 'Cardápio atualizado, carrinho e checkout pensados para o celular.' },
    { icon: Clock, title: 'Retirada sem fila', text: 'O aluno acompanha o preparo e só vai ao balcão quando estiver pronto.' },
    { icon: TrendingUp, title: 'Gestão em tempo real', text: 'Pedidos, estoque e faturamento em um só painel, sempre atualizado.' },
  ];
  return (
    <section className="relative z-10 mx-auto -mt-12 max-w-6xl px-5 sm:px-6">
      <div className="grid divide-y divide-ink-100 rounded-2xl border border-ink-200/70 bg-white shadow-elevated md:grid-cols-3 md:divide-x md:divide-y-0">
        {values.map((value) => (
          <div key={value.title} className="flex gap-4 p-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <value.icon className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-ink-950">{value.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">{value.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold text-brand-600">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-relaxed text-ink-500 sm:text-lg">{description}</p>
    </div>
  );
}

function Features() {
  const features: Array<{ icon: LucideIcon; title: string; text: string }> = [
    { icon: Smartphone, title: 'Cardápio sempre atualizado', text: 'Produtos, preços e disponibilidade refletem na hora o que a cantina define.' },
    { icon: ShoppingBag, title: 'Carrinho inteligente', text: 'Avisa sobre itens esgotados ou com estoque limitado antes de finalizar.' },
    { icon: ClipboardList, title: 'Acompanhamento do pedido', text: 'Recebido, em preparação, pronto: cada etapa com horário, no celular do aluno.' },
    { icon: ChefHat, title: 'Quadro da cozinha', text: 'Fila organizada por etapa, com tempo de espera e um clique para avançar.' },
    { icon: Layers, title: 'Estoque sem surpresas', text: 'Baixa automática a cada venda e alerta de estoque baixo para reposição.' },
    { icon: ChartColumn, title: 'Indicadores de vendas', text: 'Faturamento, mais vendidos e horários de pico para decidir com dados.' },
  ];

  return (
    <section id="funcionalidades" className="scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <SectionHeading
          eyebrow="Funcionalidades"
          title="Tudo que a cantina escolar precisa"
          description="Uma experiência simples para quem compra e uma central de controle completa para quem vende."
        />
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group rounded-2xl border border-ink-200/70 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-ink-950 text-brand-400 transition-transform duration-300 group-hover:scale-105">
                <feature.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-base font-semibold text-ink-950">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{feature.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { title: 'Escolha no cardápio', text: 'Navegue pelas categorias, veja fotos, preços e o que tem disponível agora.' },
    { title: 'Pague como preferir', text: 'PIX, dinheiro ou pagamento na cantina — você escolhe na finalização.' },
    { title: 'Retire quando ficar pronto', text: 'Acompanhe o preparo e apresente o código do pedido no balcão.' },
  ];

  return (
    <section id="como-funciona" className="scroll-mt-20 border-y border-ink-100 bg-ink-25 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <SectionHeading
          eyebrow="Como funciona"
          title="Do celular ao balcão em três passos"
          description="Feito para caber no intervalo: o pedido leva segundos e a retirada é imediata."
        />
        <ol className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-6">
          <div className="absolute top-6 right-[16%] left-[16%] hidden h-px bg-linear-to-r from-transparent via-brand-300 to-transparent md:block" aria-hidden />
          {steps.map((step, index) => (
            <li key={step.title} className="relative text-center">
              <span className="relative mx-auto flex size-12 items-center justify-center rounded-2xl bg-white text-lg font-semibold text-brand-700 shadow-soft ring-1 ring-ink-200/70">
                {index + 1}
              </span>
              <h3 className="mt-6 text-lg font-semibold text-ink-950">{step.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-500">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ForCanteens() {
  const bullets = [
    'Quadro de pedidos por etapa, com tempo de espera',
    'Cadastro de produtos com foto, preço, categoria e estoque',
    'Cardápio organizado por categorias, com ativação em um clique',
    'Histórico de compras e informações de cada estudante',
  ];
  const bars = [38, 52, 44, 66, 58, 74, 90];

  return (
    <section id="cantina" className="scroll-mt-20 overflow-hidden py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 sm:px-6 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-brand-600">Para a cantina</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
            Uma central de comando para a sua operação
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-500 sm:text-lg">
            Menos papel, menos erro e nenhuma venda de produto que já acabou. O painel mostra o que importa agora e o que
            vendeu melhor na semana.
          </p>
          <ul className="mt-8 space-y-3.5">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3 text-[15px] text-ink-700">
                <CircleCheck className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        {/* Ilustração do painel (valores ilustrativos, sem números) */}
        <div className="relative" aria-hidden>
          <div className="absolute -inset-6 rounded-[32px] bg-linear-to-br from-brand-100/60 via-white to-accent-100/50 blur-2xl" />
          <div className="relative rounded-2xl border border-ink-200/80 bg-white p-5 shadow-elevated">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-ink-500">Visão geral</p>
                <p className="text-sm font-semibold text-ink-950">Vendas da semana</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">em alta</span>
            </div>
            <div className="mt-6 flex h-40 items-end gap-3 border-b border-ink-100 px-1">
              {bars.map((height, index) => (
                <div
                  key={index}
                  className={cn('flex-1 rounded-t-[4px]', index === bars.length - 1 ? 'bg-brand-600' : 'bg-ink-200')}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between px-1 text-[10px] text-ink-400">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Hoje'].map((day) => (
                <span key={day} className="flex-1 text-center">
                  {day}
                </span>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { icon: ClipboardList, label: 'Pedidos' },
                { icon: Layers, label: 'Estoque' },
                { icon: Users, label: 'Estudantes' },
              ].map((tile) => (
                <div key={tile.label} className="rounded-xl bg-ink-50 p-3">
                  <tile.icon className="size-4 text-brand-600" />
                  <div className="mt-2 h-2 w-3/4 rounded-full bg-ink-200" />
                  <p className="mt-2 text-[11px] text-ink-500">{tile.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  const items: Array<{ icon: LucideIcon; title: string; text: string }> = [
    { icon: LockKeyhole, title: 'Acesso por perfil', text: 'Estudantes veem apenas os próprios pedidos; só a administração altera o catálogo.' },
    { icon: ShieldCheck, title: 'Dados protegidos', text: 'Senhas com hash bcrypt, sessões com tokens rotativos e validação no servidor.' },
    { icon: Layers, title: 'Estoque à prova de corrida', text: 'Transações no banco garantem que a última unidade seja vendida uma única vez.' },
  ];
  return (
    <section className="bg-ink-950 py-24 text-white sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand-400">Confiável por padrão</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Tecnologia de produto, não de planilha</h2>
          <p className="mt-4 text-base leading-relaxed text-ink-400 sm:text-lg">
            Arquitetura moderna, segura e preparada para crescer junto com a escola.
          </p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <item.icon className="size-6 text-brand-400" aria-hidden />
              <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-400">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ isAuthenticated, appHref }: { isAuthenticated: boolean; appHref: string }) {
  return (
    <section className="py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-600 to-brand-800 px-6 py-16 text-center shadow-elevated sm:px-16">
          <div className="bg-dots absolute inset-0 opacity-60" aria-hidden />
          <div className="absolute -top-24 -right-24 size-72 rounded-full bg-amber-300/20 blur-3xl" aria-hidden />
          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Pronto para acabar com a fila do intervalo?</h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-brand-100 sm:text-lg">
              Crie sua conta de estudante em menos de um minuto e faça seu primeiro pedido.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink
                to={isAuthenticated ? appHref : '/cadastro'}
                size="lg"
                variant="secondary"
                rightIcon={<ArrowRight />}
                className="w-full sm:w-auto"
              >
                {isAuthenticated ? 'Abrir o EstuLanches' : 'Criar conta grátis'}
              </ButtonLink>
              {!isAuthenticated && (
                <ButtonLink to="/login" size="lg" variant="ghost" className="w-full text-white hover:bg-white/10 hover:text-white sm:w-auto">
                  Já tenho conta
                </ButtonLink>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 sm:flex-row sm:px-6">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Logo size="sm" />
          <p className="text-sm text-ink-500">A cantina escolar, sem fila.</p>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-500" aria-label="Rodapé">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-ink-900">
              {link.label}
            </a>
          ))}
          <Link to="/login" className="hover:text-ink-900">
            Entrar
          </Link>
        </nav>
        <p className="text-sm text-ink-400">© {new Date().getFullYear()} EstuLanches</p>
      </div>
    </footer>
  );
}
