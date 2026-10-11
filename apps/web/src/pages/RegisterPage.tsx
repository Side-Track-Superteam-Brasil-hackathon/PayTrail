import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Role } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'FREELANCER' as Role });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

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

  return (
    <section className="card narrow">
      <h1>Create your account</h1>
      <form onSubmit={onSubmit}>
        <fieldset className="roles">
          <legend>I am a…</legend>
          <label><input type="radio" name="role" value="FREELANCER" checked={form.role === 'FREELANCER'} onChange={set('role')} /> Freelancer</label>
          <label><input type="radio" name="role" value="ACCOUNTANT" checked={form.role === 'ACCOUNTANT'} onChange={set('role')} /> Accountant</label>
        </fieldset>
        <label>Name<input value={form.name} onChange={set('name')} required /></label>
        <label>Email<input type="email" value={form.email} onChange={set('email')} required /></label>
        <label>Password<input type="password" minLength={8} value={form.password} onChange={set('password')} required /></label>
        {error && <p className="error">{error}</p>}
        <button disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="muted">Already have an account? <Link to="/login">Log in</Link></p>
    </section>
  );
}
