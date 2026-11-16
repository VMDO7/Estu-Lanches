const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const numberFormatter = new Intl.NumberFormat('pt-BR');
const relativeFormatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

export const formatCurrency = (value: number) => currencyFormatter.format(value);

/** Valores de eixo: "R$ 950" / "R$ 1,2 mil". */
export function formatCurrencyAxis(value: number) {
  return Math.abs(value) >= 1000 ? compactCurrencyFormatter.format(value) : currencyFormatter.format(value).replace(',00', '');
}

export const formatNumber = (value: number) => numberFormatter.format(value);

export const formatOrderCode = (code: string) => `#${code}`;

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso: string, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
  return new Date(iso).toLocaleDateString('pt-BR', options);
}

export function formatDateTime(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const time = formatTime(iso);
  if (isToday) return `Hoje, ${time}`;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Ontem, ${time}`;
  return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}, ${time}`;
}

/** Para frases: "hoje às 08:27", "ontem às 12:10", "em 05 nov às 09:41". */
export function formatWhen(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const time = formatTime(iso);
  if (date.toDateString() === today.toDateString()) return `hoje às ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `ontem às ${time}`;
  return `em ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')} às ${time}`;
}

/** "agora", "há 5 min", "há 2 h", "ontem"… */
export function formatRelative(iso: string, now: number = Date.now()) {
  const diffSeconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(diffSeconds);
  if (abs < 45) return 'agora';
  if (abs < 3600) return relativeFormatter.format(Math.round(diffSeconds / 60), 'minute');
  if (abs < 86_400) return relativeFormatter.format(Math.round(diffSeconds / 3600), 'hour');
  if (abs < 86_400 * 30) return relativeFormatter.format(Math.round(diffSeconds / 86_400), 'day');
  return formatDate(iso);
}

/** Minutos decorridos desde a data informada. */
export function minutesSince(iso: string, now: number = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
}

/**
 * Datas "AAAA-MM-DD" vindas da API já estão no fuso da cantina: são
 * formatadas sem conversão de fuso para não "voltar um dia".
 */
export function formatDayKey(dayKey: string, options: Intl.DateTimeFormatOptions) {
  const [year, month, day] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12));
  return date.toLocaleDateString('pt-BR', { ...options, timeZone: 'UTC' }).replace('.', '');
}

export function greeting(date: Date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function pluralize(count: number, singular: string, plural: string) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

/** Variação percentual entre dois valores (null quando não há base). */
export function percentChange(current: number, previous: number) {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
