import { useEffect, useState, type FormEvent } from 'react';
import { Wallet } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import type { FxRule, User } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Alert } from '../../components/Alert';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Field, inputClass } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { errorMessage } from './format';

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
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Profile" subtitle="How you appear in the directory and how you get paid." />
      <Card>
        <div className="flex items-center gap-4 pb-6 mb-6 border-b border-slate-100">
          <Avatar name={user.name} seed={user.id} size="xl" />
          <div className="min-w-0">
            <p className="font-semibold text-lg text-slate-900 truncate">{user.name}</p>
            <p className="text-sm text-slate-500 truncate">{user.email}</p>
            <Pill tone={isFreelancer ? 'indigo' : 'emerald'} className="mt-1.5">
              {isFreelancer ? 'Freelancer' : 'Accountant'}
            </Pill>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Name"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required /></Field>
            <Field label="City"><input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} /></Field>
          </div>
          <Field label="Bio"><textarea className={inputClass} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} /></Field>
          <Field label="Specialties (comma separated)">
            <input className={inputClass} value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder="crypto, export services" />
          </Field>
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 -mt-2">
              {chips.map((c) => <Pill key={c} tone="indigo">{c}</Pill>)}
            </div>
          )}

          {isFreelancer && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 space-y-5">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                <Wallet size={18} className="text-indigo-600" /> Payments
              </h3>
              <Field label="Solana wallet (receives USDC)">
                <input
                  className={`${inputClass} font-mono text-sm`}
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  placeholder="Your Solana address"
                  spellCheck={false}
                />
              </Field>
              <Field
                label="BRL conversion rule"
                hint="These rules are a simplified guide. Confirm which one applies to you with an accountant."
              >
                <select className={inputClass} value={fxRule} onChange={(e) => setFxRule(e.target.value as FxRule)}>
                  <option value="CARNE_LEAO">Carnê-leão (individuals)</option>
                  <option value="PTAX_DAY">PTAX of the day</option>
                </select>
              </Field>
            </div>
          )}

          {error && <Alert>{error}</Alert>}
          {saved && <Alert tone="success">Profile saved.</Alert>}
          <div className="flex justify-end">
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
