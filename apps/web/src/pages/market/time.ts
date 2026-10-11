const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function relativeTime(iso: string | undefined, now: number = Date.now()): string {
  if (!iso) return '';
  // Relógio do servidor pode estar um pouco adiantado: nunca mostrar tempo no futuro.
  const diff = Math.min(0, (new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(diff);
  if (abs < 45) return 'just now';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
  return formatDate(iso);
}

export function formatDate(isoOrDate: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate) ? new Date(`${isoOrDate}T00:00:00`) : new Date(isoOrDate);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

/** First day of the current month and last day of month+2. */
export function defaultPeriod(now: Date = new Date()): { start: string; end: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 3, 0);
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export function formatBrl(v: string | number): string {
  return brl.format(Number(v));
}

export function formatFee(amount: string, currency: 'BRL' | 'USDC'): string {
  return currency === 'BRL' ? formatBrl(amount) : `${amount} USDC`;
}

/** Chat timestamp: time only for today, otherwise short date + time. */
export function formatMessageTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return time;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`;
}
