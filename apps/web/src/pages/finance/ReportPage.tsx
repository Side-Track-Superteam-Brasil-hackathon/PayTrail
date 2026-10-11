import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, getToken } from '../../api/client';
import type { MonthlyReport } from '../../api/types';
import {
  currentMonth, errorMessage, formatBrl, formatDate, formatDateTime, formatRate, formatUsdc, shortAddr,
} from './format';
import './finance.css';

export function ReportPage() {
  const { freelancerId, month: monthParam } = useParams<{ freelancerId?: string; month?: string }>();
  const navigate = useNavigate();
  const [localMonth, setLocalMonth] = useState(currentMonth());
  const month = monthParam ?? localMonth;
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noAccess, setNoAccess] = useState(false);
  const [exporting, setExporting] = useState(false);

  const query = `month=${encodeURIComponent(month)}${freelancerId ? `&freelancerId=${encodeURIComponent(freelancerId)}` : ''}`;

  useEffect(() => {
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    let cancelled = false;
    setReport(null);
    setError(null);
    setNoAccess(false);
    api<MonthlyReport>(`/reports/monthly?${query}`)
      .then((r) => { if (!cancelled) setReport(r); })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 403) setNoAccess(true);
        else setError(errorMessage(e));
      });
    return () => { cancelled = true; };
  }, [query, month]);

  const changeMonth = (m: string) => {
    if (!m) return;
    if (freelancerId) navigate(`/clients/${freelancerId}/${m}`);
    else setLocalMonth(m);
  };

  const exportCsv = async () => {
    setExporting(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(`/api/reports/monthly.csv?${query}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 403) { setNoAccess(true); return; }
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `paytrail-report-${month}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fin-stack">
      <div className="fin-head">
        <div>
          {freelancerId && <Link to="/clients" className="muted">← My clients</Link>}
          <h1>Monthly report</h1>
        </div>
        <div className="fin-row">
          <input type="month" value={month} onChange={(e) => changeMonth(e.target.value)} aria-label="Month" />
          <button onClick={() => void exportCsv()} disabled={exporting || noAccess}>{exporting ? 'Exporting…' : 'Export CSV'}</button>
        </div>
      </div>

      {noAccess && (
        <div className="card fin-empty">
          <h3>No access</h3>
          <p className="muted">You do not have access to this report for the selected month. Access may have been revoked or may not cover this period.</p>
        </div>
      )}
      {error && <div className="fin-alert-error">{error}</div>}
      {!report && !error && !noAccess && <p className="muted">Loading…</p>}

      {report && (
        <>
          <div className="fin-grid">
            <div className="fin-stat hl"><div className="k">Total USDC</div><div className="v">{formatUsdc(report.totalUsdc)}</div></div>
            <div className="fin-stat hl"><div className="k">Total BRL</div><div className="v">{formatBrl(report.totalBrl)}</div></div>
            <div className="fin-stat"><div className="k">Payments</div><div className="v">{report.rows?.length ?? 0}</div></div>
          </div>

          {(report.unmatchedCount ?? 0) > 0 && (
            <div className="fin-banner">
              {report.unmatchedCount} unmatched payment{report.unmatchedCount === 1 ? '' : 's'} not included in this report.
              {!freelancerId && <> <Link to="/payments/unmatched">Review them</Link>.</>}
            </div>
          )}

          {(report.rows?.length ?? 0) === 0 ? (
            <div className="card fin-empty"><p className="muted">No payments in {month}.</p></div>
          ) : (
            <div className="card fin-table-wrap">
              <table className="fin-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Client</th><th>Invoice</th><th>Tx</th><th className="num">USDC</th>
                    <th>FX rule</th><th>FX date</th><th className="num">Rate</th><th className="num">BRL</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows!.map((r, i) => (
                    <tr key={`${r.txHash}-${i}`}>
                      <td>{formatDateTime(r.date)}</td>
                      <td>{r.clientName}</td>
                      <td className="fin-mono">{r.invoicePublicId}</td>
                      <td>{r.explorerUrl ? <a href={r.explorerUrl} target="_blank" rel="noreferrer">{shortAddr(r.txHash)} ↗</a> : shortAddr(r.txHash)}</td>
                      <td className="num">{formatUsdc(r.amountUsdc)}</td>
                      <td>{r.fxRule === 'CARNE_LEAO' ? 'Carnê-leão' : 'PTAX day'}</td>
                      <td>{formatDate(r.fxDate)}</td>
                      <td className="num">{formatRate(r.fxRate)}</td>
                      <td className="num">{formatBrl(r.amountBrl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
