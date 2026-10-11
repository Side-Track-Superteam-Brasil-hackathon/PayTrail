import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { Conversation, PublicProfile, Role } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { errorMessage } from './errors';
import './market.css';

type RoleFilter = Role | 'ALL';

export function DirectoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<RoleFilter>(user?.role === 'ACCOUNTANT' ? 'FREELANCER' : 'ACCOUNTANT');
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [profiles, setProfiles] = useState<PublicProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(input.trim()), 300);
    return () => window.clearTimeout(t);
  }, [input]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (role !== 'ALL') params.set('role', role);
    if (q) params.set('q', q);
    const qs = params.toString();
    api<PublicProfile[]>(`/users${qs ? `?${qs}` : ''}`)
      .then((r) => {
        if (cancelled) return;
        setProfiles(r.filter((p) => p.id !== user?.id));
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [role, q, user?.id]);

  async function message(p: PublicProfile) {
    if (!p.id) return;
    setOpening(p.id);
    setError(null);
    try {
      const c = await api<Conversation>('/conversations', {
        method: 'POST',
        body: JSON.stringify({ participantId: p.id }),
      });
      navigate(`/inbox/${c.id}`);
    } catch (e) {
      setError(errorMessage(e));
      setOpening(null);
    }
  }

  return (
    <div className="market">
      <div className="page-head">
        <h1>Directory</h1>
        <p className="muted">Find accountants and freelancers by name, city or specialty.</p>
      </div>
      <div className="toolbar">
        <input
          type="search"
          placeholder="Search name, city, specialty..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Search"
        />
        <select value={role} onChange={(e) => setRole(e.target.value as RoleFilter)} aria-label="Role">
          <option value="ACCOUNTANT">Accountants</option>
          <option value="FREELANCER">Freelancers</option>
          <option value="ALL">Everyone</option>
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {profiles === null && !error && <p className="muted">Loading...</p>}
      {profiles?.length === 0 && (
        <div className="card empty muted">No profiles found. Try a different search or filter.</div>
      )}
      <div className="grid">
        {profiles?.map((p) => (
          <div className="tile" key={p.id}>
            <div className="tile-head">
              <div>
                <strong>{p.name}</strong>
                <div className="muted small">{p.city ?? 'Brazil'}</div>
              </div>
              <span className="role-tag">{p.role?.toLowerCase()}</span>
            </div>
            {p.specialties && p.specialties.length > 0 && (
              <div className="chips">
                {p.specialties.map((s) => (
                  <span className="chip" key={s}>{s}</span>
                ))}
              </div>
            )}
            {p.bio && <p className="bio">{p.bio}</p>}
            <div className="actions">
              <button disabled={opening === p.id} onClick={() => void message(p)}>
                {opening === p.id ? 'Opening...' : 'Message'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
