import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api, ApiError } from '../../api/client';
import type { PayPageData } from '../../api/types';
import { CopyButton } from './CopyButton';
import { errorMessage, formatExact } from './format';
import { usePolling } from './usePolling';
import './finance.css';

export function PayPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const [data, setData] = useState<PayPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!publicId) return;
    try {
      setData(await api<PayPageData>(`/pay/${encodeURIComponent(publicId)}`));
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setNotFound(true);
      else setError(errorMessage(e));
    }
  }, [publicId]);

  useEffect(() => { void load(); }, [load]);
  const finished = data?.status === 'PAID' || data?.status === 'OVERPAID' || data?.status === 'CANCELLED';
  usePolling(() => void load(), 4000, !notFound && !finished);

  if (notFound) return <div className="pay-wrap card pay-card"><h2>Invoice not found</h2><p className="muted">Check the link you received.</p></div>;
  if (!data) return <div className="pay-wrap">{error ? <div className="fin-alert-error">{error}</div> : <p className="muted">Loading…</p>}</div>;

  const paid = data.status === 'PAID' || data.status === 'OVERPAID';
  const amount = formatExact(data.amountToSend);

  return (
    <div className="pay-wrap fin-stack">
      <div className="card pay-card">
        <div className="muted">{data.freelancerName} is requesting a payment</div>
        <h2 style={{ margin: '4px 0' }}>{data.description}</h2>
        <div className="muted">Billed to {data.clientName}</div>

        {paid ? (
          <div className="pay-success">
            <div className="tick">✓</div>
            <h2 style={{ margin: 0 }}>Payment received</h2>
            <p className="muted">Thank you! {data.freelancerName} has been paid for this invoice.</p>
          </div>
        ) : data.status === 'CANCELLED' ? (
          <div className="fin-alert-error" style={{ marginTop: 16 }}>This invoice was cancelled. Please do not send a payment.</div>
        ) : (
          <>
            <div style={{ marginTop: 20 }} className="muted">
              {data.status === 'PARTIALLY_PAID' ? 'Remaining balance — send exactly' : 'Send exactly'}
            </div>
            <div className="pay-amount">{amount} USDC</div>
            <div className="fin-row" style={{ justifyContent: 'center' }}>
              <CopyButton text={amount} label="Copy amount" />
            </div>

            {data.solanaPayUrl && (
              <>
                <div className="pay-qr"><QRCodeSVG value={data.solanaPayUrl} size={220} level="M" /></div>
                <a className="fin-btn big" href={data.solanaPayUrl}>Open in wallet</a>
              </>
            )}

            <div style={{ marginTop: 20, textAlign: 'left' }}>
              <div className="muted" style={{ fontSize: '0.85rem' }}>Recipient address (Solana, USDC)</div>
              <div className="fin-row">
                <div className="fin-mono" style={{ flex: 1, minWidth: 0 }}>{data.recipientAddress}</div>
                <CopyButton text={data.recipientAddress} />
              </div>
            </div>

            <div className="pay-warn" style={{ marginTop: 16 }}>
              Send exactly this amount. If paying from an exchange, make sure the fee is not deducted from it.
              Send USDC on the Solana network only.
            </div>

            <div style={{ marginTop: 16 }}>
              <span className="pay-live">Waiting for payment…</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
