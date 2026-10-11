import { ApiError } from '../../api/client';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Parse a decimal string; display-only (never used for accounting). */
function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function formatUsdc(v: string | null | undefined): string {
  if (v == null || v === '') return '—';
  return num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  return brl.format(num(v));
}

export function formatRate(v: string | null | undefined): string {
  if (v == null || v === '') return '—';
  return num(v).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

/** YYYY-MM-DD -> "Oct 11, 2026" without timezone drift. */
export function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  if (!y || !m || !day) return d;
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
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
  if (e instanceof Error) return e.message;
  return 'Something went wrong';
}

export function humanize(code: string): string {
  const s = code.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
