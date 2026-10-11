import type { InvoiceStatus, MatchMethod } from '../../api/types';
import { Pill, type PillTone } from '../../components/Pill';
import { humanize } from './format';

const LABEL: Record<InvoiceStatus, string> = {
  OPEN: 'Open',
  PARTIALLY_PAID: 'Partially paid',
  PAID: 'Paid',
  OVERPAID: 'Overpaid',
  CANCELLED: 'Cancelled',
};

const TONE: Record<InvoiceStatus, PillTone> = {
  OPEN: 'amber',
  PARTIALLY_PAID: 'blue',
  PAID: 'emerald',
  OVERPAID: 'violet',
  CANCELLED: 'slate',
};

const METHOD_TONE: Record<MatchMethod, PillTone> = {
  REFERENCE: 'emerald',
  CONTRACT_EVENT: 'indigo',
  UNIQUE_AMOUNT: 'blue',
  MANUAL: 'amber',
};

export function StatusBadge({ status, overdue }: { status: InvoiceStatus; overdue?: boolean }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Pill tone={TONE[status]}>{LABEL[status]}</Pill>
      {overdue && status !== 'PAID' && status !== 'CANCELLED' && <Pill tone="red">Overdue</Pill>}
    </span>
  );
}

export function MethodBadge({ method }: { method?: MatchMethod }) {
  if (!method) return <span className="text-slate-300">—</span>;
  return <Pill tone={METHOD_TONE[method]}>{humanize(method)}</Pill>;
}
