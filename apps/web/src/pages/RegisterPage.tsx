import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Check, CheckCircle, Circle, Eye, EyeOff, User } from 'lucide-react';
import { ApiError, type Role } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { isStrongPassword, PASSWORD_RULES, PASSWORD_TOO_LONG } from '../auth/passwordPolicy';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { cx } from '../components/cx';
import { Field, inputClass } from '../components/Field';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeToggle } from '../components/ThemeToggle';
import { useI18n } from '../i18n/I18nProvider';

interface RoleCardProps {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  text: string;
  tone: 'indigo' | 'emerald';
}

function RoleCard({ selected, onSelect, icon, title, text, tone }: RoleCardProps) {
  const indigo = tone === 'indigo';
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cx(
        'group relative bg-white p-6 sm:p-8 rounded-2xl shadow-sm border-2 transition-all text-left flex flex-col items-center',
        selected
          ? indigo
            ? 'border-indigo-500 ring-4 ring-indigo-100 shadow-md'
            : 'border-emerald-500 ring-4 ring-emerald-100 shadow-md'
          : indigo
            ? 'border-slate-200 hover:border-indigo-400 hover:shadow-md'
            : 'border-slate-200 hover:border-emerald-400 hover:shadow-md',
      )}
    >
      {selected && (
        <CheckCircle
          size={22}
          className={cx('absolute top-4 right-4', indigo ? 'text-indigo-600' : 'text-emerald-600')}
        />
      )}
      <div
        className={cx(
          'w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-5 group-hover:scale-110 transition-transform',
          indigo ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600',
        )}
      >
        {icon}
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-slate-900 text-center">{title}</h3>
      <p className="text-slate-500 text-center mt-2 text-sm sm:text-base">{text}</p>
    </button>
  );
}

function PasswordChecklist({ password }: { password: string }) {
  const { t } = useI18n();
  const rules = PASSWORD_TOO_LONG.ok(password) ? PASSWORD_RULES : [...PASSWORD_RULES, PASSWORD_TOO_LONG];
  return (
    <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs" aria-label={t('password.requirements')}>
      {rules.map((r) => {
        const ok = r.ok(password);
        return (
          <li key={r.key} className={cx('flex items-center gap-1.5', ok ? 'text-emerald-600' : 'text-slate-500')}>
            {ok ? <Check size={14} className="shrink-0" /> : <Circle size={10} className="shrink-0 mx-0.5" />}
            {t(r.key)}
          </li>
        );
      })}
    </ul>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'FREELANCER' as Role });
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const setRole = (role: Role) => setForm({ ...form, role });

  const strong = isStrongPassword(form.password);
  const mismatch = confirm.length > 0 && confirm !== form.password;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!strong) {
      setError(t('register.weakPassword'));
      return;
    }
    if (confirm !== form.password) {
      setError(t('register.passwordsDontMatch'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') setError(t('register.emailTaken'));
      else if (err instanceof ApiError && err.code === 'WEAK_PASSWORD') setError(t('register.weakPassword'));
      else setError(err instanceof Error ? err.message : t('register.failed'));
    } finally {
      setBusy(false);
    }
  }

  const accountant = form.role === 'ACCOUNTANT';
  const passwordType = showPassword ? 'text' : 'password';

  return (
    <div className="auth-page min-h-[100dvh] flex items-center justify-center p-4 py-10">
      <div className="fixed right-4 top-4 flex items-center gap-2">
        <ThemeToggle compact darkSurface />
        <LanguageSwitcher />
      </div>
      <div className="max-w-3xl w-full">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-[#ff8a4c] font-bold text-xl tracking-tight mb-3">PayTrail</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">{t('register.title')}</h2>
          <p className="text-white/70 mt-2">{t('register.subtitle')}</p>
        </div>

        <form onSubmit={onSubmit}>
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6" role="radiogroup" aria-label={t('register.iAm')}>
            <RoleCard
              tone="indigo"
              selected={form.role === 'FREELANCER'}
              onSelect={() => setRole('FREELANCER')}
              icon={<User size={36} />}
              title={t('register.freelancerTitle')}
              text={t('register.freelancerText')}
            />
            <RoleCard
              tone="emerald"
              selected={accountant}
              onSelect={() => setRole('ACCOUNTANT')}
              icon={<Briefcase size={36} />}
              title={t('register.accountantTitle')}
              text={t('register.accountantText')}
            />
          </div>

          <div className="auth-panel bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 mt-6 max-w-md mx-auto space-y-4">
            <h3 className="font-semibold text-slate-900">{t('register.formTitle')}</h3>
            <Field label={t('common.name')}>
              <input className={inputClass} autoComplete="name" value={form.name} onChange={set('name')} required />
            </Field>
            <Field label={t('common.email')}>
              <input
                type="email"
                autoComplete="email"
                placeholder={t('register.emailPlaceholder')}
                className={inputClass}
                value={form.email}
                onChange={set('email')}
                required
              />
            </Field>
            <div>
              <Field label={t('common.password')}>
                <div className="relative">
                  <input
                    type={passwordType}
                    autoComplete="new-password"
                    className={cx(inputClass, 'pr-11')}
                    value={form.password}
                    onChange={set('password')}
                    aria-invalid={form.password.length > 0 && !strong}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-700"
                    aria-label={showPassword ? t('register.hidePassword') : t('register.showPassword')}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
              <PasswordChecklist password={form.password} />
            </div>
            <Field
              label={t('register.confirmPassword')}
              hint={
                confirm.length === 0 ? undefined : mismatch ? (
                  <span className="text-red-600">{t('register.passwordsDontMatch')}</span>
                ) : (
                  <span className="text-emerald-600">{t('register.passwordsMatch')}</span>
                )
              }
            >
              <input
                type={passwordType}
                autoComplete="new-password"
                className={inputClass}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={mismatch}
                required
              />
            </Field>
            {error && <Alert>{error}</Alert>}
            <Button type="submit" variant={accountant ? 'emerald' : 'accent'} disabled={busy} className="w-full">
              {busy ? t('register.creating') : accountant ? t('register.createAccountant') : t('register.createFreelancer')}
            </Button>
            <p className="text-center text-sm text-slate-500">
              {t('register.haveAccount')}{' '}
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-800">
                {t('register.logIn')}
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
