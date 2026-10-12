import { ApiError } from '../../api/client';
import { currentLocale, translate } from '../../i18n/I18nProvider';
import { en, type MessageKey } from '../../i18n/messages';

/** Parse a decimal string; display-only (never used for accounting). */
function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function formatUsdc(v: string | null | undefined): string {
  if (v == null || v === '') return '—';
  return num(v).toLocaleString(currentLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Exact amount: all significant decimals (min 2), as a plain string (no grouping). */
export function formatExact(v: string | null | undefined): string {
  if (v == null || v === '') return '—';
  const [int, frac = ''] = v.split('.');
  const trimmed = frac.replace(/0+$/, '');
  return `${int}.${trimmed.padEnd(2, '0')}`;
}

export function formatBrl(v: string | null | undefined): string {
  if (v == null || v === '') return '—';
  return new Intl.NumberFormat(currentLocale(), { style: 'currency', currency: 'BRL' }).format(num(v));
}

export function formatRate(v: string | null | undefined): string {
  if (v == null || v === '') return '—';
  return num(v).toLocaleString(currentLocale(), { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

/** YYYY-MM-DD -> "Oct 11, 2026" (or "11 de out. de 2026") without timezone drift. */
export function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  if (!y || !m || !day) return d;
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString(currentLocale(), {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString(currentLocale(), { dateStyle: 'medium', timeStyle: 'short' });
}

export function shortAddr(a: string | null | undefined): string {
  if (!a) return '—';
  return a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-6)}` : a;
}

export function todayPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message || e.code;
  // fetch rejeita com TypeError quando o servidor está fora do ar
  if (e instanceof TypeError) return translate('common.networkError');
  if (e instanceof Error) return e.message || translate('common.unexpectedError');
  return translate('common.unexpectedError');
}

export function humanize(code: string): string {
  const s = code.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Translated label for an API code (`{prefix}.{code}`), falling back to `humanize` for unknown codes. */
export function codeLabel(prefix: string, code: string): string {
  const key = `${prefix}.${code}`;
  return key in en ? translate(key as MessageKey) : humanize(code);
}
