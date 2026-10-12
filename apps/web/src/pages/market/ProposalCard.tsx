import { useState } from 'react';
import { CalendarRange, CheckCircle, ShieldCheck, XCircle } from 'lucide-react';
import { api } from '../../api/client';
import type { Proposal } from '../../api/types';
import { Button } from '../../components/Button';
import { Pill, type PillTone } from '../../components/Pill';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages';
import { errorMessage } from './errors';
import { formatDate, formatFee } from './time';

interface Props {
  proposal: Proposal;
  currentUserId: string;
  onChange: (p: Proposal) => void;
}

type Status = NonNullable<Proposal['status']>;

const STATUS_LABEL: Record<Status, MessageKey> = {
  SENT: 'market.proposal.status.SENT',
  ACCEPTED: 'market.proposal.status.ACCEPTED',
  REJECTED: 'market.proposal.status.REJECTED',
  CANCELLED: 'market.proposal.status.CANCELLED',
};

const STATUS_TONE: Record<Status, PillTone> = {
  SENT: 'amber',
  ACCEPTED: 'emerald',
  REJECTED: 'red',
  CANCELLED: 'slate',
};

export function ProposalCard({ proposal, currentUserId, onChange }: Props) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status: Status = proposal.status ?? 'SENT';
  const isRecipient = proposal.recipientId === currentUserId;
  const isSender = proposal.senderId === currentUserId;

  async function act(action: 'accept' | 'reject' | 'cancel') {
    setBusy(true);
    setError(null);
    try {
      onChange(await api<Proposal>(`/proposals/${proposal.id}/${action}`, { method: 'POST' }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-md w-full max-w-[340px]">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-indigo-600 min-w-0">
          <ShieldCheck size={20} className="shrink-0" />
          <span className="font-semibold text-xs uppercase tracking-wider whitespace-nowrap">{t('market.proposal.heading')}</span>
        </div>
        <Pill tone={STATUS_TONE[status]}>{t(STATUS_LABEL[status])}</Pill>
      </div>
      <h4 className="font-medium text-slate-900 mb-1">{t('market.proposal.service')}</h4>
      <p className="flex items-start gap-1.5 text-sm text-slate-500 mb-2">
        <CalendarRange size={16} className="shrink-0 mt-0.5" />
        <span>
          {t('market.proposal.access', {
            start: proposal.periodStart ? formatDate(proposal.periodStart) : '',
            end: proposal.periodEnd ? formatDate(proposal.periodEnd) : '',
          })}
        </span>
      </p>
      {proposal.note && <p className="text-sm text-slate-600 mb-2 whitespace-pre-wrap break-words">{proposal.note}</p>}
      <div className="bg-slate-50 p-3 rounded-lg my-4 flex justify-between items-center gap-2">
        <span className="text-sm font-medium text-slate-700">{t('market.proposal.fee')}</span>
        <span className="font-bold text-slate-900 tabular-nums">
          {formatFee(proposal.feeAmount ?? '0', proposal.feeCurrency ?? 'BRL')}
        </span>
      </div>

      {status === 'SENT' && isRecipient && (
        <div className="space-y-2">
          <Button className="w-full" disabled={busy} onClick={() => void act('accept')}>{t('market.proposal.accept')}</Button>
          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => void act('reject')}>{t('market.proposal.reject')}</Button>
        </div>
      )}
      {status === 'SENT' && isSender && (
        <div className="space-y-2">
          <p className="text-xs text-center text-slate-500">{t('market.proposal.waiting')}</p>
          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => void act('cancel')}>{t('market.proposal.cancel')}</Button>
        </div>
      )}
      {status === 'ACCEPTED' && (
        <div className="w-full bg-emerald-50 text-emerald-700 py-2.5 rounded-xl font-medium text-center border border-emerald-200 flex items-center justify-center gap-2">
          <CheckCircle size={18} /> {t('market.proposal.closed')}
        </div>
      )}
      {(status === 'REJECTED' || status === 'CANCELLED') && (
        <div className="w-full bg-slate-50 text-slate-500 py-2.5 rounded-xl font-medium text-center border border-slate-200 flex items-center justify-center gap-2">
          <XCircle size={18} /> {status === 'REJECTED' ? t('market.proposal.rejected') : t('market.proposal.cancelled')}
        </div>
      )}
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}
