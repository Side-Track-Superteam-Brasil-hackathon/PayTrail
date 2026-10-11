import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarRange, Eye, EyeOff, Lock, MapPin, ShieldCheck, ShieldOff } from 'lucide-react';
import { api } from '../../api/client';
import type { AccountantAccess } from '../../api/types';
import { Alert } from '../../components/Alert';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Loading } from '../../components/Loading';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { errorMessage } from './errors';
import { formatDate, formatDateTime } from './time';

interface LogEntry {
  action?: string;
  createdAt?: string;
}

const ACTION_LABEL: Record<string, string> = {
  VIEW_REPORT: 'Viewed monthly report',
  EXPORT_CSV: 'Exported CSV',
  VIEW_INVOICE: 'Viewed an invoice',
};

function without<T>(rec: Record<string, T>, key: string): Record<string, T> {
  const copy = { ...rec };
  delete copy[key];
  return copy;
}

export function MyAccountantsPage() {
  const [items, setItems] = useState<AccountantAccess[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, LogEntry[] | 'loading'>>({});
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api<AccountantAccess[]>('/access'));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleLog(id: string) {
    if (logs[id]) {
      setLogs((l) => without(l, id));
      return;
    }
    setLogs((l) => ({ ...l, [id]: 'loading' }));
    try {
      const r = await api<LogEntry[]>(`/access/${id}/logs`);
      setLogs((l) => ({ ...l, [id]: r }));
    } catch (e) {
      setLogs((l) => without(l, id));
      setError(errorMessage(e));
    }
  }

  async function revoke(id: string) {
    setBusy(id);
    try {
      const updated = await api<AccountantAccess>(`/access/${id}/revoke`, { method: 'POST' });
      setItems((list) => list?.map((a) => (a.id === id ? updated : a)) ?? null);
      setConfirming(null);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My accountants" subtitle="Who can see your accounting history, and what they did with it." />
      <div className="flex gap-3 bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-2xl p-4 text-sm">
        <Lock size={18} className="text-indigo-600 shrink-0 mt-0.5" />
        <p>
          Access is granted only when you accept a proposal, and only for the period you agreed on. You can revoke it at
          any time, with immediate effect, and every view or export by your accountant is logged here.
        </p>
      </div>
      {error && <Alert>{error}</Alert>}
      {items === null && !error && <Loading />}
      {items?.length === 0 && (
        <EmptyState icon={<ShieldCheck size={26} />} title="No accountant has access to your records">
          <Link to="/directory">Find an accountant</Link> and send a proposal from the conversation.
        </EmptyState>
      )}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        {items?.map((a) => {
          const id = a.id ?? '';
          const log = logs[id];
          const status = a.status ?? 'ACTIVE';
          return (
            <div key={id} className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <Avatar name={a.accountant?.name} seed={a.accountant?.id} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-lg text-slate-900 truncate">{a.accountant?.name}</h3>
                    <Pill tone={status === 'ACTIVE' ? 'emerald' : 'red'}>{status === 'ACTIVE' ? 'Active' : 'Revoked'}</Pill>
                  </div>
                  {a.accountant?.city && (
                    <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <MapPin size={12} /> {a.accountant.city}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3.5 text-sm space-y-1">
                <p className="flex items-center gap-2 text-slate-700">
                  <CalendarRange size={16} className="text-slate-400 shrink-0" />
                  Period: {a.periodStart && formatDate(a.periodStart)} to {a.periodEnd && formatDate(a.periodEnd)}
                </p>
                <p className="text-xs text-slate-500 pl-6">
                  Granted {a.grantedAt && formatDateTime(a.grantedAt)}
                  {a.revokedAt && ` · Revoked ${formatDateTime(a.revokedAt)}`}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void toggleLog(id)}
                  icon={log ? <EyeOff size={16} /> : <Eye size={16} />}
                >
                  {log ? 'Hide access log' : 'View access log'}
                </Button>
                {status === 'ACTIVE' && confirming !== id && (
                  <Button variant="danger" size="sm" onClick={() => setConfirming(id)} icon={<ShieldOff size={16} />}>
                    Revoke
                  </Button>
                )}
              </div>

              {confirming === id && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
                  Revoke {a.accountant?.name}&apos;s access now? They will immediately lose access to your records.
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="dangerSolid"
                      disabled={busy === id}
                      onClick={() => void revoke(id)}
                    >
                      {busy === id ? 'Revoking...' : 'Yes, revoke'}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setConfirming(null)}>Keep access</Button>
                  </div>
                </div>
              )}

              {log === 'loading' && <p className="text-sm text-slate-500">Loading log...</p>}
              {Array.isArray(log) &&
                (log.length === 0 ? (
                  <p className="text-sm text-slate-500">No access recorded yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl text-sm">
                    {log.map((l, i) => (
                      <li key={`${l.createdAt}-${i}`} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 px-3.5 py-2.5">
                        <span className="text-slate-700">{ACTION_LABEL[l.action ?? ''] ?? l.action}</span>
                        <span className="text-xs text-slate-400">{l.createdAt && formatDateTime(l.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
