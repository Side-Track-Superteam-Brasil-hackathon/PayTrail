import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { Invoice, Payment } from '../../api/types';
import { errorMessage, formatDateTime, formatExact, humanize, shortAddr } from './format';
import './finance.css';

export function UnmatchedPage() {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [a, b, o, p] = await Promise.all([
        api<Payment[]>('/payments?status=UNMATCHED'),
        api<Payment[]>('/payments?status=AMBIGUOUS'),
        api<Invoice[]>('/invoices?status=OPEN'),
        api<Invoice[]>('/invoices?status=PARTIALLY_PAID'),
      ]);
      const all = [...a, ...b].sort((x, y) => (y.blockTime ?? '').localeCompare(x.blockTime ?? ''));
      setPayments(all);
      setInvoices([...o, ...p]);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const match = async (pay: Payment) => {
    const invoiceId = selected[pay.id!];
    if (!invoiceId) return;
    setBusyId(pay.id!);
    setError(null);
    setNotice(null);
    try {
      await api(`/payments/${pay.id}/match`, { method: 'POST', body: JSON.stringify({ invoiceId }) });
      setNotice(`Payment of ${formatExact(pay.amount)} USDC matched.`);
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fin-stack">
      <div className="fin-head"><h1>Unmatched payments</h1></div>
      <p className="muted" style={{ marginTop: 0 }}>
        Payments received on your wallet that could not be linked to an invoice automatically. Match them manually.
      </p>
      {error && <div className="fin-alert-error">{error}</div>}
      {notice && <div className="fin-ok">{notice}</div>}
      {!payments && !error && <p className="muted">Loading…</p>}

      {payments && payments.length === 0 && (
        <div className="card fin-empty">
          <h3>All caught up</h3>
          <p className="muted">There are no unmatched payments.</p>
        </div>
      )}

      {payments && payments.length > 0 && (
        <div className="card fin-table-wrap">
          <table className="fin-table">
            <thead>
              <tr><th className="num">USDC</th><th>From</th><th>Time</th><th>Reason</th><th>Tx</th><th>Match to invoice</th></tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="num"><strong>{formatExact(p.amount)}</strong></td>
                  <td className="fin-mono">{shortAddr(p.fromAddress)}</td>
                  <td>{formatDateTime(p.blockTime)}</td>
                  <td>
                    <span className="fin-badge">{p.status === 'AMBIGUOUS' ? 'Ambiguous' : 'Unmatched'}</span>{' '}
                    <span className="muted">{p.unmatchedReason ? humanize(p.unmatchedReason) : ''}</span>
                  </td>
                  <td>{p.explorerUrl ? <a href={p.explorerUrl} target="_blank" rel="noreferrer">{shortAddr(p.txHash)} ↗</a> : shortAddr(p.txHash)}</td>
                  <td>
                    <div className="fin-row" style={{ flexWrap: 'nowrap' }}>
                      <select
                        value={selected[p.id!] ?? ''}
                        onChange={(e) => setSelected((s) => ({ ...s, [p.id!]: e.target.value }))}
                        aria-label="Invoice"
                        style={{ minWidth: 0, maxWidth: 220 }}
                      >
                        <option value="">Select invoice…</option>
                        {invoices.map((i) => (
                          <option key={i.id} value={i.id}>{i.clientName} — {i.description} ({formatExact(i.balance)} due)</option>
                        ))}
                      </select>
                      <button disabled={!selected[p.id!] || busyId === p.id} onClick={() => void match(p)}>
                        {busyId === p.id ? '…' : 'Match'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && <p className="muted">No open invoices to match to. <Link to="/invoices/new">Create one</Link>.</p>}
        </div>
      )}
    </div>
  );
}
