import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import type { InvoiceDetail, Receipt } from '../../api/types';
import { CopyButton } from './CopyButton';
import {
  errorMessage, formatBrl, formatDate, formatDateTime, formatExact, formatRate, formatUsdc, humanize, shortAddr,
} from './format';
import { MethodBadge, StatusBadge } from './StatusBadge';
import { usePolling } from './usePolling';
import './finance.css';

function payLink(inv: InvoiceDetail): string {
  const p = inv.payUrl ?? `/pay/${inv.publicId}`;
  return p.startsWith('http') ? p : `${window.location.origin}${p.startsWith('/') ? '' : '/'}${p}`;
}

function Stat({ k, v, hl }: { k: string; v: string; hl?: boolean }) {
  return (
    <div className={`fin-stat${hl ? ' hl' : ''}`}>
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [inv, setInv] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setInv(await api<InvoiceDetail>(`/invoices/${id}`));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);
  usePolling(() => void load(), 5000, inv?.status === 'OPEN' || inv?.status === 'PARTIALLY_PAID');

  const cancel = async () => {
    if (!inv || !window.confirm('Cancel this invoice?')) return;
    setBusy(true);
    setActionError(null);
    try {
      await api(`/invoices/${inv.id}/cancel`, { method: 'POST' });
      await load();
    } catch (e) {
      setActionError(e instanceof ApiError && e.code === 'INVOICE_HAS_PAYMENTS'
        ? 'This invoice already has payments and cannot be cancelled.' : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const genReceipt = async () => {
    if (!inv) return;
    setBusy(true);
    setActionError(null);
    try {
      setReceipt(await api<Receipt>(`/invoices/${inv.id}/receipt`, { method: 'POST' }));
      await load();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (error && !inv) return <div className="fin-alert-error">{error} <Link to="/invoices">Back to invoices</Link></div>;
  if (!inv) return <p className="muted">Loading…</p>;

  const payments = inv.payments ?? [];
  const events = inv.events ?? [];
  const status = inv.status!;
  const hasExcess = inv.excess != null && Number(inv.excess) > 0;
  const canCancel = status === 'OPEN' && payments.length === 0;
  const canReceipt = payments.length > 0 && status !== 'CANCELLED';
  const link = payLink(inv);
  const verifyLink = receipt ? (receipt.verifyUrl?.startsWith('http') ? receipt.verifyUrl : `${window.location.origin}/verify/${receipt.sha256}`) : '';

  return (
    <div className="fin-stack">
      <div className="fin-head">
        <div>
          <Link to="/invoices" className="muted">← Invoices</Link>
          <h1>{inv.description}</h1>
          <div className="fin-row">
            <StatusBadge status={status} overdue={inv.overdue} />
            <span className="muted">{inv.clientName}{inv.clientEmail ? ` · ${inv.clientEmail}` : ''} · due {formatDate(inv.dueDate)}</span>
          </div>
        </div>
        <div className="fin-row">
          {canReceipt && <button onClick={genReceipt} disabled={busy}>Generate receipt</button>}
          {canCancel && <button className="fin-btn-danger" onClick={cancel} disabled={busy}>Cancel invoice</button>}
        </div>
      </div>

      {actionError && <div className="fin-alert-error">{actionError}</div>}

      <div className="fin-grid">
        <Stat k="Base amount" v={`${formatUsdc(inv.baseAmount)} USDC`} />
        <Stat k="Exact amount to send" v={`${formatExact(inv.uniqueAmount)} USDC`} hl />
        <Stat k="Paid" v={`${formatUsdc(inv.amountPaid)} USDC`} />
        <Stat k="Balance" v={`${formatUsdc(inv.balance)} USDC`} />
        {hasExcess && <Stat k="Excess" v={`${formatUsdc(inv.excess)} USDC`} />}
      </div>

      {receipt && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Receipt generated</h3>
          <div className="muted">SHA-256</div>
          <div className="fin-mono">{receipt.sha256}</div>
          <div className="fin-row" style={{ marginTop: 10 }}>
            <Link to={`/verify/${receipt.sha256}`} className="fin-btn">Open verify page</Link>
            <CopyButton text={verifyLink} label="Copy verify link" />
            <CopyButton text={receipt.sha256 ?? ''} label="Copy hash" />
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Payment link</h3>
        <div className="fin-row">
          <input className="fin-input-readonly" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          <CopyButton text={link} />
          <a className="fin-btn-ghost" href={link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Open</a>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Payments</h3>
        {payments.length === 0 ? (
          <p className="muted">No payments yet. This page refreshes automatically.</p>
        ) : (
          <div className="fin-table-wrap">
            <table className="fin-table">
              <thead>
                <tr>
                  <th className="num">USDC</th><th>Method</th><th className="num">BRL</th><th>FX</th><th>From</th><th>Tx</th><th>Time</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="num">{formatExact(p.amount)}</td>
                    <td><MethodBadge method={p.matchMethod} /></td>
                    <td className="num">{formatBrl(p.amountBrl)}</td>
                    <td>
                      {p.fxRule ? (
                        <>
                          <div>{p.fxRule === 'CARNE_LEAO' ? 'Carnê-leão' : 'PTAX of the day'}</div>
                          <div className="muted">{formatDate(p.fxDate)} · {formatRate(p.fxRate)}</div>
                        </>
                      ) : '—'}
                    </td>
                    <td className="fin-mono">{shortAddr(p.fromAddress)}</td>
                    <td>{p.explorerUrl ? <a href={p.explorerUrl} target="_blank" rel="noreferrer">{shortAddr(p.txHash)} ↗</a> : shortAddr(p.txHash)}</td>
                    <td>{formatDateTime(p.blockTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Trail</h3>
        {events.length === 0 ? (
          <p className="muted">No events yet.</p>
        ) : (
          <ul className="fin-trail">
            {events.map((ev, idx) => (
              <li key={`${ev.createdAt}-${idx}`}>
                <div className="t">{humanize(ev.type ?? '')}</div>
                <div className="d">{formatDateTime(ev.createdAt)}</div>
                {ev.payload && Object.keys(ev.payload).length > 0 && (
                  <div className="p">
                    {Object.entries(ev.payload as Record<string, unknown>)
                      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                      .join(' · ')}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
