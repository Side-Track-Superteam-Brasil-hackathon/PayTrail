import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import type { Invoice } from '../../api/types';
import { errorMessage, todayPlusDays } from './format';
import './finance.css';

export function NewInvoicePage() {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(todayPlusDays(15));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletMissing, setWalletMissing] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setWalletMissing(false);
    setBusy(true);
    try {
      const body: Record<string, string> = {
        clientName: clientName.trim(),
        description: description.trim(),
        network: 'SOLANA',
        baseAmount: Number(amount).toFixed(2),
        dueDate,
      };
      if (clientEmail.trim()) body.clientEmail = clientEmail.trim();
      const inv = await api<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(body) });
      navigate(`/invoices/${inv.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'WALLET_NOT_SET') setWalletMissing(true);
      else if (err instanceof ApiError && err.code === 'NO_UNIQUE_SUFFIX')
        setError('This wallet already has 99 open invoices, so no unique amount is available. Wait for some to be paid or cancel one, then try again.');
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>New invoice</h1>
      {walletMissing && (
        <div className="fin-banner" style={{ marginBottom: 12 }}>
          Set your Solana wallet in your <Link to="/profile">profile</Link> before creating an invoice.
        </div>
      )}
      <form onSubmit={submit}>
        <label>
          Client name
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} required placeholder="Acme Inc" />
        </label>
        <label>
          Client email (optional)
          <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="billing@acme.com" />
        </label>
        <label>
          Description
          <input value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Landing page — Acme Inc" />
        </label>
        <div className="fin-form-row">
          <label>
            Amount (USDC)
            <input type="number" inputMode="decimal" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="1500.00" />
          </label>
          <label>
            Due date
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </label>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
          We add a few cents to the amount so every invoice has its own exact value and payments can be matched automatically.
        </p>
        {error && <div className="fin-alert-error">{error}</div>}
        <div className="fin-row">
          <button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create invoice'}</button>
          <Link to="/invoices">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
