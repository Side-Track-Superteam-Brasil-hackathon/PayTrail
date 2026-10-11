import type { InvoiceStatus, MatchMethod } from '../../api/types';
import { humanize } from './format';
import './finance.css';

const LABEL: Record<InvoiceStatus, string> = {
  OPEN: 'Open',
  PARTIALLY_PAID: 'Partially paid',
  PAID: 'Paid',
  OVERPAID: 'Overpaid',
  CANCELLED: 'Cancelled',
};

export function StatusBadge({ status, overdue }: { status: InvoiceStatus; overdue?: boolean }) {
  return (
    <span className="fin-badges">
      <span className={`fin-badge st-${status}`}>{LABEL[status]}</span>
      {overdue && status !== 'PAID' && status !== 'CANCELLED' && <span className="fin-badge st-OVERDUE">Overdue</span>}
    </span>
  );
}

export function MethodBadge({ method }: { method?: MatchMethod }) {
  if (!method) return <span className="muted">—</span>;
  return <span className={`fin-badge m-${method}`}>{humanize(method)}</span>;
}
