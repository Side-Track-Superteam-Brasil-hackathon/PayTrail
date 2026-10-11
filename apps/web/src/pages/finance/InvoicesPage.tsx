import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { Invoice, InvoiceStatus } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { formatDate, formatExact, formatUsdc, errorMessage } from './format';
import { StatusBadge } from './StatusBadge';
import './finance.css';

const FILTERS: { value: InvoiceStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'PARTIALLY_PAID', label: 'Partially paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERPAID', label: 'Overpaid' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function InvoicesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<InvoiceStatus | ''>('');
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setInvoices(null);
    api<Invoice[]>(`/invoices${filter ? `?status=${filter}` : ''}`)
      .then((r) => { if (!cancelled) { setInvoices(r); setError(null); } })
      .catch((e: unknown) => { if (!cancelled) setError(errorMessage(e)); });
    return () => { cancelled = true; };
  }, [filter]);

  return (
    <div className="fin-stack">
      <div className="fin-head">
        <h1>Invoices</h1>
        <Link to="/invoices/new" className="fin-btn">New invoice</Link>
      </div>

      {user && !user.solanaWallet && (
        <div className="fin-banner">
          You have not set a Solana wallet yet. Add one in your <Link to="/profile">profile</Link> to create invoices.
        </div>
      )}

      <div className="fin-filters" role="tablist" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button key={f.value} className={filter === f.value ? 'on' : ''} onClick={() => setFilter(f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="fin-alert-error">{error}</div>}
      {!invoices && !error && <p className="muted">Loading…</p>}

      {invoices && invoices.length === 0 && (
        <div className="card fin-empty">
          <h3>{filter ? 'No invoices with this status' : 'No invoices yet'}</h3>
          <p className="muted">Create your first invoice and share the payment link with your client.</p>
          <Link to="/invoices/new" className="fin-btn">New invoice</Link>
        </div>
      )}

      {invoices && invoices.length > 0 && (
        <div className="card fin-table-wrap">
          <table className="fin-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Client</th>
                <th>Description</th>
                <th className="num">Base</th>
                <th className="num">Exact amount</th>
                <th className="num">Paid</th>
                <th className="num">Balance</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="clickable" onClick={() => navigate(`/invoices/${i.id}`)}>
                  <td><StatusBadge status={i.status!} overdue={i.overdue} /></td>
                  <td><Link to={`/invoices/${i.id}`} onClick={(e) => e.stopPropagation()}>{i.clientName}</Link></td>
                  <td>{i.description}</td>
                  <td className="num">{formatUsdc(i.baseAmount)}</td>
                  <td className="num">{formatExact(i.uniqueAmount)}</td>
                  <td className="num">{formatUsdc(i.amountPaid)}</td>
                  <td className="num">{formatUsdc(i.balance)}</td>
                  <td>{formatDate(i.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
