import {
  CakeSlice,
  Candy,
  Cherry,
  Citrus,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Dessert,
  GlassWater,
  IceCreamCone,
  Milk,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

interface Visual {
  icon: LucideIcon;
  /** Fundo do placeholder (classes completas, detectáveis pelo Tailwind). */
  surface: string;
  iconColor: string;
}

const CATEGORY_VISUALS: Record<string, Visual> = {
  salgados: { icon: Croissant, surface: 'from-amber-50 via-orange-100 to-amber-200', iconColor: 'text-orange-700/70' },
  doces: { icon: CakeSlice, surface: 'from-rose-50 via-pink-100 to-rose-200', iconColor: 'text-rose-700/70' },
  bebidas: { icon: CupSoda, surface: 'from-sky-50 via-cyan-100 to-sky-200', iconColor: 'text-sky-700/70' },
  lanches: { icon: Sandwich, surface: 'from-lime-50 via-emerald-100 to-green-200', iconColor: 'text-emerald-700/70' },
  outros: { icon: Cherry, surface: 'from-violet-50 via-fuchsia-100 to-violet-200', iconColor: 'text-violet-700/70' },
};

const FALLBACK_VISUALS = Object.values(CATEGORY_VISUALS);

/**
 * Ícone específico por palavra do nome (comparação por palavra inteira, sem
 * acentos). A ordem importa: "X-salada" é lanche antes de ser salada.
 */
const KEYWORD_ICONS: Array<[ReadonlySet<string>, LucideIcon]> = [
  [new Set(['coxinha', 'pastel', 'esfiha', 'kibe', 'quibe', 'enroladinho', 'empada', 'salgado', 'pao', 'croissant']), Croissant],
  [new Set(['misto', 'sanduiche', 'wrap', 'hamburguer', 'lanche', 'x', 'beirute']), Sandwich],
  [new Set(['suco', 'laranja', 'limonada']), Citrus],
  [new Set(['agua']), GlassWater],
  [new Set(['refrigerante', 'refri', 'soda']), CupSoda],
  [new Set(['achocolatado', 'leite', 'iogurte', 'vitamina']), Milk],
  [new Set(['cafe', 'cha', 'capuccino']), Coffee],
  [new Set(['brigadeiro', 'bala', 'bombom', 'beijinho']), Candy],
  [new Set(['bolo', 'torta']), CakeSlice],
  [new Set(['brownie', 'pudim', 'mousse']), Dessert],
  [new Set(['cookie', 'biscoito']), Cookie],
  [new Set(['pipoca']), Popcorn],
  [new Set(['salada', 'fruta', 'frutas']), Salad],
  [new Set(['sorvete', 'picole', 'acai']), IceCreamCone],
  [new Set(['pizza']), Pizza],
];

function words(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function hash(value: string) {
  let result = 0;
  for (let i = 0; i < value.length; i++) result = (result * 33 + value.charCodeAt(i)) | 0;
  return Math.abs(result);
}

export function productVisual(name: string, categorySlug?: string): Visual {
  const base =
    (categorySlug && CATEGORY_VISUALS[categorySlug]) ||
    FALLBACK_VISUALS[hash(categorySlug ?? name) % FALLBACK_VISUALS.length]!;
  const tokens = words(name);
  const keywordIcon = KEYWORD_ICONS.find(([keywords]) => tokens.some((token) => keywords.has(token)))?.[1];
  return { ...base, icon: keywordIcon ?? base.icon ?? UtensilsCrossed };
}

export function categoryIcon(slug: string): LucideIcon {
  return CATEGORY_VISUALS[slug]?.icon ?? UtensilsCrossed;
}
