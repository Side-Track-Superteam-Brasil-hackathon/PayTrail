import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, CheckCircle, User } from 'lucide-react';
import type { Role } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { cx } from '../components/cx';
import { Field, inputClass } from '../components/Field';
import { ThemeToggle } from '../components/ThemeToggle';

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

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'FREELANCER' as Role });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const setRole = (role: Role) => setForm({ ...form, role });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setBusy(false);
    }
  }

  const accountant = form.role === 'ACCOUNTANT';

  return (
    <div className="auth-page min-h-[100dvh] flex items-center justify-center p-4 py-10">
      <div className="fixed right-4 top-4"><ThemeToggle compact darkSurface /></div>
      <div className="max-w-3xl w-full">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-indigo-600 font-bold text-xl tracking-tight mb-3">PayTrail</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">How do you want to use PayTrail?</h2>
          <p className="text-slate-500 mt-2">Choose your profile to personalize your experience.</p>
        </div>

        <form onSubmit={onSubmit}>
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6" role="radiogroup" aria-label="I am a…">
            <RoleCard
              tone="indigo"
              selected={form.role === 'FREELANCER'}
              onSelect={() => setRole('FREELANCER')}
              icon={<User size={36} />}
              title="I'm a service provider"
              text="Issue invoices, get paid in USDC and find accountants to organize your finances."
            />
            <RoleCard
              tone="emerald"
              selected={accountant}
              onSelect={() => setRole('ACCOUNTANT')}
              icon={<Briefcase size={36} />}
              title="I'm an accountant"
              text="Find Web3 clients, send proposals and securely access their accounting history."
            />
          </div>

          <div className="auth-panel bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 mt-6 max-w-md mx-auto space-y-4">
            <h3 className="font-semibold text-slate-900">Create your account</h3>
            <Field label="Name">
              <input className={inputClass} autoComplete="name" value={form.name} onChange={set('name')} required />
            </Field>
            <Field label="Email">
              <input
                type="email"
                autoComplete="email"
                placeholder="you@email.com"
                className={inputClass}
                value={form.email}
                onChange={set('email')}
                required
              />
            </Field>
            <Field label="Password" hint="At least 8 characters.">
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                className={inputClass}
                value={form.password}
                onChange={set('password')}
                required
              />
            </Field>
            {error && <Alert>{error}</Alert>}
            <Button type="submit" variant={accountant ? 'emerald' : 'accent'} disabled={busy} className="w-full">
              {busy ? 'Creating…' : accountant ? 'Create accountant account' : 'Create freelancer account'}
            </Button>
            <p className="text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-800">
                Log in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
