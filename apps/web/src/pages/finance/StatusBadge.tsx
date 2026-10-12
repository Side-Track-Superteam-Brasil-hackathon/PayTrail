import type { InvoiceStatus, MatchMethod } from '../../api/types';
import { Pill, type PillTone } from '../../components/Pill';
import { useI18n } from '../../i18n/I18nProvider';

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
  const { t } = useI18n();
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Pill tone={TONE[status]}>{t(`finance.status.${status}`)}</Pill>
      {overdue && status !== 'PAID' && status !== 'CANCELLED' && <Pill tone="red">{t('finance.status.overdue')}</Pill>}
    </span>
  );
}

export function MethodBadge({ method }: { method?: MatchMethod }) {
  const { t } = useI18n();
  if (!method) return <span className="text-slate-300">—</span>;
  return <Pill tone={METHOD_TONE[method]}>{t(`finance.method.${method}`)}</Pill>;
}
