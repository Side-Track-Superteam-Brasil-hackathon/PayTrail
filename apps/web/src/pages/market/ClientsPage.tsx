import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { AccountantAccess, PublicProfile } from '../../api/types';
import { errorMessage } from './errors';
import { currentMonth, formatBrl, formatDate } from './time';
import './market.css';

interface ClientRow {
  freelancer?: PublicProfile;
  access?: AccountantAccess;
  currentMonthUsdc?: string;
  currentMonthBrl?: string;
  unmatchedCount?: number;
}

export function ClientsPage() {
  const [items, setItems] = useState<ClientRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const month = currentMonth();

  useEffect(() => {
    api<ClientRow[]>('/accountant/clients')
      .then(setItems)
      .catch((e: unknown) => setError(errorMessage(e)));
  }, []);

  return (
    <div className="market">
      <div className="page-head">
        <h1>My clients</h1>
        <p className="muted">Freelancers who granted you read-only access. Current month: {month}.</p>
      </div>
      {error && <p className="error">{error}</p>}
      {items === null && !error && <p className="muted">Loading...</p>}
      {items?.length === 0 && (
        <div className="card empty">
          <p className="muted">No clients yet. Access appears here once a freelancer accepts your proposal.</p>
          <Link to="/directory">Browse the directory</Link> or check your <Link to="/inbox">inbox</Link>.
        </div>
      )}
      <div className="grid">
        {items?.map((c) => (
          <div className="tile" key={c.freelancer?.id}>
            <div className="tile-head">
              <div>
                <strong>{c.freelancer?.name}</strong>
                <div className="muted small">
                  Access: {c.access?.periodStart && formatDate(c.access.periodStart)} to{' '}
                  {c.access?.periodEnd && formatDate(c.access.periodEnd)}
                </div>
              </div>
            </div>
            <div>
              <div className="stat">{formatBrl(c.currentMonthBrl ?? '0')}</div>
              <div className="muted small">{c.currentMonthUsdc ?? '0'} USDC this month</div>
            </div>
            {(c.unmatchedCount ?? 0) > 0 && (
              <div className="alert">
                {c.unmatchedCount} unmatched payment{c.unmatchedCount === 1 ? '' : 's'} need attention
              </div>
            )}
            <div className="actions">
              <Link className="btn" to={`/clients/${c.freelancer?.id}/${month}`}>Open report</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
