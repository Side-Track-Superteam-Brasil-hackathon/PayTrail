import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import type { Receipt } from '../../api/types';
import { errorMessage } from './format';
import './finance.css';

interface VerifyHashResponse { valid?: boolean; receipt?: Receipt }
interface VerifyBodyResponse { sha256?: string; valid?: boolean }

function pretty(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

export function VerifyPage() {
  const { hash } = useParams<{ hash?: string }>();
  const navigate = useNavigate();
  const [hashInput, setHashInput] = useState(hash ?? '');
  const [result, setResult] = useState<VerifyHashResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [pasted, setPasted] = useState('');
  const [pasteResult, setPasteResult] = useState<VerifyBodyResponse | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);

  useEffect(() => {
    setResult(null);
    setNotFound(false);
    setError(null);
    if (!hash) return;
    let cancelled = false;
    setLoading(true);
    api<VerifyHashResponse>(`/verify/${encodeURIComponent(hash)}`)
      .then((r) => { if (!cancelled) setResult(r); })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) setNotFound(true);
        else setError(errorMessage(e));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [hash]);

  const lookup = (e: FormEvent) => {
    e.preventDefault();
    const h = hashInput.trim();
    if (h) navigate(`/verify/${h}`);
  };

  const verifyPasted = async (e: FormEvent) => {
    e.preventDefault();
    setPasteResult(null);
    setPasteError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(pasted);
    } catch {
      setPasteError('This is not valid JSON.');
      return;
    }
    try {
      setPasteResult(await api<VerifyBodyResponse>('/verify', { method: 'POST', body: JSON.stringify(parsed) }));
    } catch (err) {
      setPasteError(errorMessage(err));
    }
  };

  return (
    <div className="fin-stack" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="fin-head"><h1>Verify a receipt</h1></div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>By hash</h3>
        <form onSubmit={lookup}>
          <div className="fin-row">
            <input className="fin-input-readonly" style={{ background: '#fff' }} value={hashInput} onChange={(e) => setHashInput(e.target.value)} placeholder="SHA-256 of the receipt" />
            <button type="submit">Verify</button>
          </div>
        </form>

        {loading && <p className="muted">Checking…</p>}
        {error && <div className="fin-alert-error" style={{ marginTop: 12 }}>{error}</div>}
        {notFound && <div className="fin-alert-error" style={{ marginTop: 12 }}>No receipt with this hash.</div>}
        {result && (
          <div style={{ marginTop: 12 }}>
            {result.valid ? <div className="fin-ok">✓ Valid receipt — the hash matches a receipt issued by PayTrail.</div>
              : <div className="fin-alert-error">✗ Invalid receipt.</div>}
            {result.receipt && (
              <>
                <p className="muted" style={{ marginBottom: 4 }}>
                  Issued {new Date(result.receipt.createdAt ?? '').toLocaleString('en-US')}
                  {result.receipt.anchorTx ? ` · anchored in tx ${result.receipt.anchorTx}` : ''}
                </p>
                <pre className="fin-pre">{pretty(result.receipt.canonicalJson ?? '')}</pre>
              </>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>By receipt JSON</h3>
        <p className="muted" style={{ marginTop: 0 }}>Paste a receipt JSON. We recompute its hash and check it against issued receipts. Any change makes it invalid.</p>
        <form onSubmit={verifyPasted}>
          <textarea rows={8} value={pasted} onChange={(e) => setPasted(e.target.value)} className="fin-mono" placeholder="{ ... }" />
          <div><button type="submit" disabled={!pasted.trim()}>Verify JSON</button></div>
        </form>
        {pasteError && <div className="fin-alert-error" style={{ marginTop: 12 }}>{pasteError}</div>}
        {pasteResult && (
          <div style={{ marginTop: 12 }}>
            {pasteResult.valid ? <div className="fin-ok">✓ Valid — this JSON matches an issued receipt.</div>
              : <div className="fin-alert-error">✗ Invalid — this JSON does not match any issued receipt.</div>}
            {pasteResult.sha256 && <p className="muted fin-mono">sha256: {pasteResult.sha256}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
