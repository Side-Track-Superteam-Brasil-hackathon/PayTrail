import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import type { FxRule, User } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { errorMessage } from './format';
import './finance.css';

export function ProfilePage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [wallet, setWallet] = useState('');
  const [fxRule, setFxRule] = useState<FxRule>('CARNE_LEAO');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setCity(user.city ?? '');
    setBio(user.bio ?? '');
    setSpecialties((user.specialties ?? []).join(', '));
    setWallet(user.solanaWallet ?? '');
    setFxRule(user.fxRule ?? 'CARNE_LEAO');
  }, [user]);

  if (!user) return null;
  const isFreelancer = user.role === 'FREELANCER';
  const chips = specialties.split(',').map((s) => s.trim()).filter(Boolean);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const body: Record<string, unknown> = { name: name.trim(), city: city.trim(), bio: bio.trim(), specialties: chips };
    if (isFreelancer) {
      if (wallet.trim()) body.solanaWallet = wallet.trim();
      body.fxRule = fxRule;
    }
    try {
      await api<User>('/me', { method: 'PATCH', body: JSON.stringify(body) });
      await refresh();
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_WALLET') setError('This is not a valid Solana address.');
      else if (err instanceof ApiError && err.code === 'WALLET_TAKEN') setError('This wallet is already used by another account.');
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>Profile</h1>
      <p className="muted" style={{ marginTop: 0 }}>{user.email} · {user.role === 'FREELANCER' ? 'Freelancer' : 'Accountant'}</p>
      <form onSubmit={submit}>
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label>City<input value={city} onChange={(e) => setCity(e.target.value)} /></label>
        <label>Bio<textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} /></label>
        <label>
          Specialties (comma separated)
          <input value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder="crypto, export services" />
        </label>
        {chips.length > 0 && <div className="fin-chips">{chips.map((c) => <span key={c} className="fin-chip">{c}</span>)}</div>}

        {isFreelancer && (
          <>
            <label>
              Solana wallet (receives USDC)
              <input className="fin-mono" value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="Your Solana address" spellCheck={false} />
            </label>
            <label>
              BRL conversion rule
              <select value={fxRule} onChange={(e) => setFxRule(e.target.value as FxRule)}>
                <option value="CARNE_LEAO">Carnê-leão (individuals)</option>
                <option value="PTAX_DAY">PTAX of the day</option>
              </select>
            </label>
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              These rules are a simplified guide. Confirm which one applies to you with an accountant.
            </p>
          </>
        )}

        {error && <div className="fin-alert-error">{error}</div>}
        {saved && <div className="fin-ok">Profile saved.</div>}
        <div><button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div>
      </form>
    </div>
  );
}
