import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, ChevronRight, MessageSquare, Search, ShieldCheck, Wallet } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import type { FxRule, User } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Alert } from '../../components/Alert';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Card, CardTitle } from '../../components/Card';
import { Field, inputClass } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { useI18n } from '../../i18n/I18nProvider';
import { errorMessage } from './format';

function ToolLink({ to, icon, title, text }: { to: string; icon: ReactNode; title: string; text: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors"
    >
      <span className="shrink-0 w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-slate-900">{title}</span>
        <span className="block text-sm text-slate-500">{text}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-slate-400 group-hover:text-indigo-600" />
    </Link>
  );
}

export function ProfilePage() {
  const { t } = useI18n();
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
      if (err instanceof ApiError && err.code === 'INVALID_WALLET') setError(t('profile.invalidWallet'));
      else if (err instanceof ApiError && err.code === 'WALLET_TAKEN') setError(t('profile.walletTaken'));
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={t('profile.title')}
        subtitle={isFreelancer ? t('profile.subtitleFreelancer') : t('profile.subtitleAccountant')}
      />
      <Card>
        <div className="flex items-center gap-4 pb-6 mb-6 border-b border-slate-100">
          <Avatar name={user.name} seed={user.id} size="xl" />
          <div className="min-w-0">
            <p className="font-semibold text-lg text-slate-900 truncate">{user.name}</p>
            <p className="text-sm text-slate-500 truncate">{user.email}</p>
            <Pill tone={isFreelancer ? 'indigo' : 'emerald'} className="mt-1.5">
              {isFreelancer ? t('common.freelancer') : t('common.accountant')}
            </Pill>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label={t('common.name')}><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required /></Field>
            <Field label={t('profile.city')}><input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} /></Field>
          </div>
          <Field
            label={isFreelancer ? t('profile.bioFreelancer') : t('profile.bioAccountant')}
            hint={isFreelancer ? t('profile.bioHintFreelancer') : t('profile.bioHintAccountant')}
          >
            <textarea
              className={inputClass}
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={isFreelancer ? t('profile.bioPlaceholderFreelancer') : t('profile.bioPlaceholderAccountant')}
            />
          </Field>
          <Field label={isFreelancer ? t('profile.specialtiesFreelancer') : t('profile.specialtiesAccountant')}>
            <input
              className={inputClass}
              value={specialties}
              onChange={(e) => setSpecialties(e.target.value)}
              placeholder={isFreelancer ? t('profile.specialtiesPlaceholderFreelancer') : t('profile.specialtiesPlaceholderAccountant')}
            />
          </Field>
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 -mt-2">
              {chips.map((c) => <Pill key={c} tone="indigo">{c}</Pill>)}
            </div>
          )}

          {isFreelancer && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 space-y-5">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                <Wallet size={18} className="text-indigo-600" /> {t('profile.payments')}
              </h3>
              <Field label={t('profile.wallet')}>
                <input
                  className={`${inputClass} font-mono text-sm`}
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  placeholder={t('profile.walletPlaceholder')}
                  spellCheck={false}
                />
              </Field>
              <Field
                label={t('profile.fxRule')}
                hint={t('profile.fxRuleHint')}
              >
                <select className={inputClass} value={fxRule} onChange={(e) => setFxRule(e.target.value as FxRule)}>
                  <option value="CARNE_LEAO">{t('profile.fxCarneLeao')}</option>
                  <option value="PTAX_DAY">{t('profile.fxPtaxDay')}</option>
                </select>
              </Field>
            </div>
          )}

          {error && <Alert>{error}</Alert>}
          {saved && <Alert tone="success">{t('profile.saved')}</Alert>}
          <div className="flex justify-end">
            <Button type="submit" disabled={busy}>{busy ? t('common.saving') : t('common.save')}</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle>{t('profile.toolsTitle')}</CardTitle>
        <div className="space-y-3">
          {isFreelancer ? (
            <>
              <ToolLink to="/accountants" icon={<ShieldCheck size={20} />} title={t('nav.myAccountants')} text={t('profile.toolAccountantsText')} />
              <ToolLink to="/inbox" icon={<MessageSquare size={20} />} title={t('nav.messages')} text={t('profile.toolInboxFreelancerText')} />
              <ToolLink to="/directory" icon={<Search size={20} />} title={t('nav.findAccountant')} text={t('profile.toolFindAccountantText')} />
            </>
          ) : (
            <>
              <ToolLink to="/clients" icon={<Briefcase size={20} />} title={t('nav.myClients')} text={t('profile.toolClientsText')} />
              <ToolLink to="/inbox" icon={<MessageSquare size={20} />} title={t('nav.messages')} text={t('profile.toolInboxAccountantText')} />
              <ToolLink to="/directory" icon={<Search size={20} />} title={t('nav.findClients')} text={t('profile.toolFindClientsText')} />
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
