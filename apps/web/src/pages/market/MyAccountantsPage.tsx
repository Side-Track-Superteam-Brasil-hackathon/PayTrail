import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { AccountantAccess } from '../../api/types';
import { errorMessage } from './errors';
import { formatDate, formatDateTime } from './time';
import './market.css';

interface LogEntry {
  action?: string;
  createdAt?: string;
}

const ACTION_LABEL: Record<string, string> = {
  VIEW_REPORT: 'Viewed monthly report',
  EXPORT_CSV: 'Exported CSV',
  VIEW_INVOICE: 'Viewed an invoice',
};

function without<T>(rec: Record<string, T>, key: string): Record<string, T> {
  const copy = { ...rec };
  delete copy[key];
  return copy;
}

export function MyAccountantsPage() {
  const [items, setItems] = useState<AccountantAccess[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, LogEntry[] | 'loading'>>({});
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api<AccountantAccess[]>('/access'));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleLog(id: string) {
    if (logs[id]) {
      setLogs((l) => without(l, id));
      return;
    }
    setLogs((l) => ({ ...l, [id]: 'loading' }));
    try {
      const r = await api<LogEntry[]>(`/access/${id}/logs`);
      setLogs((l) => ({ ...l, [id]: r }));
    } catch (e) {
      setLogs((l) => without(l, id));
      setError(errorMessage(e));
    }
  }

  async function revoke(id: string) {
    setBusy(id);
    try {
      const updated = await api<AccountantAccess>(`/access/${id}/revoke`, { method: 'POST' });
      setItems((list) => list?.map((a) => (a.id === id ? updated : a)) ?? null);
      setConfirming(null);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="market">
      <div className="page-head">
        <h1>My accountants</h1>
      </div>
      <div className="info">
        Access is granted only when you accept a proposal, and only for the period you agreed on. You can revoke it at
        any time, with immediate effect, and every view or export by your accountant is logged here.
      </div>
      {error && <p className="error">{error}</p>}
      {items === null && !error && <p className="muted">Loading...</p>}
      {items?.length === 0 && (
        <div className="card empty">
          <p className="muted">No accountant has access to your records.</p>
          <Link to="/directory">Find an accountant</Link> and send a proposal from the conversation.
        </div>
      )}
      <div className="stack">
        {items?.map((a) => {
          const id = a.id ?? '';
          const log = logs[id];
          const status = a.status ?? 'ACTIVE';
          return (
            <div className="tile" key={id}>
              <div className="tile-head">
                <div>
                  <strong>{a.accountant?.name}</strong>
                  <div className="muted small">{a.accountant?.city}</div>
                </div>
                <span className={`badge badge-${status.toLowerCase()}`}>{status === 'ACTIVE' ? 'Active' : 'Revoked'}</span>
              </div>
              <div className="small">
                Period: {a.periodStart && formatDate(a.periodStart)} to {a.periodEnd && formatDate(a.periodEnd)}
              </div>
              <div className="muted small">
                Granted {a.grantedAt && formatDateTime(a.grantedAt)}
                {a.revokedAt && ` · Revoked ${formatDateTime(a.revokedAt)}`}
              </div>
              <div className="actions">
                <button className="secondary" onClick={() => void toggleLog(id)}>
                  {log ? 'Hide access log' : 'View access log'}
                </button>
                {status === 'ACTIVE' && confirming !== id && (
                  <button className="danger" onClick={() => setConfirming(id)}>Revoke</button>
                )}
              </div>
              {confirming === id && (
                <div className="alert">
                  Revoke {a.accountant?.name}&apos;s access now? They will immediately lose access to your records.
                  <div className="actions" style={{ marginTop: 8 }}>
                    <button className="danger" disabled={busy === id} onClick={() => void revoke(id)}>
                      {busy === id ? 'Revoking...' : 'Yes, revoke'}
                    </button>
                    <button className="secondary" onClick={() => setConfirming(null)}>Keep access</button>
                  </div>
                </div>
              )}
              {log === 'loading' && <p className="muted small">Loading log...</p>}
              {Array.isArray(log) &&
                (log.length === 0 ? (
                  <p className="muted small">No access recorded yet.</p>
                ) : (
                  <ul className="log small">
                    {log.map((l, i) => (
                      <li key={`${l.createdAt}-${i}`}>
                        {ACTION_LABEL[l.action ?? ''] ?? l.action} ·{' '}
                        <span className="muted">{l.createdAt && formatDateTime(l.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
