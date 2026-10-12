import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Field, inputClass } from '../components/Field';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useI18n } from '../i18n/I18nProvider';

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_CREDENTIALS') setError(t('login.invalid'));
      else setError(err instanceof Error ? err.message : t('login.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page min-h-[100dvh] flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="auth-panel bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">PayTrail</h1>
          <p className="text-slate-500 mt-2">{t('login.tagline')}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={t('common.email')}>
            <input
              type="email"
              autoComplete="email"
              placeholder={t('register.emailPlaceholder')}
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label={t('common.password')}>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" variant="orange" disabled={busy} className="w-full mt-2">
            {busy ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>

        <div className="relative flex items-center py-5">
          <div className="flex-grow border-t border-slate-200" />
          <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">{t('common.or')}</span>
          <div className="flex-grow border-t border-slate-200" />
        </div>

        <p className="text-center text-sm text-slate-500">
          {t('login.noAccount')}{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-800">
            {t('login.signUp')}
          </Link>
        </p>
      </div>
    </div>
  );
}
