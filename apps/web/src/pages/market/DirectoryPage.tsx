import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Filter, MapPin, MessageSquare, Search, Users } from 'lucide-react';
import { api } from '../../api/client';
import type { Conversation, PublicProfile, Role } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Alert } from '../../components/Alert';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { cx } from '../../components/cx';
import { EmptyState } from '../../components/EmptyState';
import { Loading } from '../../components/Loading';
import { PageHeader } from '../../components/PageHeader';
import { errorMessage } from './errors';

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
    <div>
      <PageHeader
        title={user?.role === 'ACCOUNTANT' ? 'Find clients' : 'Find an accountant'}
        subtitle="Find accountants and freelancers by name, city or specialty."
      />
      <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
          <input
            type="search"
            placeholder="Search name, city, specialty..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Search"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as RoleFilter)}
            aria-label="Role"
            className="w-full sm:w-auto appearance-none pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-medium shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ACCOUNTANT">Accountants</option>
            <option value="FREELANCER">Freelancers</option>
            <option value="ALL">Everyone</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        </div>
      </div>

      {error && <Alert className="mb-6">{error}</Alert>}
      {profiles === null && !error && <Loading />}
      {profiles?.length === 0 && (
        <EmptyState icon={<Users size={26} />} title="No profiles found">
          Try a different search or filter.
        </EmptyState>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {profiles?.map((p) => {
          const accountant = p.role === 'ACCOUNTANT';
          return (
            <div
              key={p.id}
              className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 flex flex-col hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4 mb-4">
                <Avatar name={p.name} seed={p.id} size="lg" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-lg text-slate-900 truncate">{p.name}</h3>
                  <span
                    className={cx(
                      'inline-block text-sm font-medium px-2 py-0.5 rounded-md mt-0.5',
                      accountant ? 'text-emerald-700 bg-emerald-50' : 'text-indigo-600 bg-indigo-50',
                    )}
                  >
                    {accountant ? 'Accountant' : 'Freelancer'}
                  </span>
                  <p className="flex items-center gap-1 text-xs text-slate-500 mt-1.5">
                    <MapPin size={12} /> {p.city ?? 'Brazil'}
                  </p>
                </div>
              </div>
              {p.bio && <p className="text-slate-600 text-sm mb-4 line-clamp-3">{p.bio}</p>}
              {p.specialties && p.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {p.specialties.map((s) => (
                    <span key={s} className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{s}</span>
                  ))}
                </div>
              )}
              <Button
                className="w-full mt-auto"
                disabled={opening === p.id}
                onClick={() => void message(p)}
                icon={<MessageSquare size={18} />}
              >
                {opening === p.id ? 'Opening...' : 'Start conversation'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
