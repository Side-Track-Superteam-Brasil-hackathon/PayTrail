import { useState } from 'react';
import { api } from '../../api/client';
import type { Proposal } from '../../api/types';
import { errorMessage } from './errors';
import { formatDate, formatFee } from './time';
import './market.css';

interface Props {
  proposal: Proposal;
  currentUserId: string;
  onChange: (p: Proposal) => void;
}

type Status = NonNullable<Proposal['status']>;

const STATUS_LABEL: Record<Status, string> = {
  SENT: 'Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export function ProposalCard({ proposal, currentUserId, onChange }: Props) {
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
    <div className={`proposal proposal-${status.toLowerCase()}`}>
      <div className="proposal-head">
        <strong>Proposal</strong>
        <span className={`badge badge-${status.toLowerCase()}`}>{STATUS_LABEL[status]}</span>
      </div>
      <div className="proposal-fee">{formatFee(proposal.feeAmount ?? '0', proposal.feeCurrency ?? 'BRL')}</div>
      <div className="muted small">
        Access to monthly reports: {proposal.periodStart && formatDate(proposal.periodStart)} to{' '}
        {proposal.periodEnd && formatDate(proposal.periodEnd)}
      </div>
      {proposal.note && <p className="proposal-note">{proposal.note}</p>}
      {status === 'SENT' && (
        <div className="proposal-actions">
          {isRecipient && (
            <>
              <button disabled={busy} onClick={() => void act('accept')}>Accept</button>
              <button className="secondary" disabled={busy} onClick={() => void act('reject')}>Reject</button>
            </>
          )}
          {isSender && (
            <button className="secondary" disabled={busy} onClick={() => void act('cancel')}>Cancel</button>
          )}
        </div>
      )}
      {error && <p className="error small">{error}</p>}
    </div>
  );
}
