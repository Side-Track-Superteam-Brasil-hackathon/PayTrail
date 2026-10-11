import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BarChart3, Briefcase, CalendarRange } from 'lucide-react';
import { api } from '../../api/client';
import type { AccountantAccess, PublicProfile } from '../../api/types';
import { Alert } from '../../components/Alert';
import { Avatar } from '../../components/Avatar';
import { ButtonLink } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Loading } from '../../components/Loading';
import { PageHeader } from '../../components/PageHeader';
import { errorMessage } from './errors';
import { currentMonth, formatBrl, formatDate } from './time';

interface ClientRow {
  freelancer?: PublicProfile;
  access?: AccountantAccess;
  currentMonthUsdc?: string;
  currentMonthBrl?: string;
  unmatchedCount?: number;
}

export function ClientsPage() {
  const [items, setItems] = useState<ClientRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const month = currentMonth();

  useEffect(() => {
    api<ClientRow[]>('/accountant/clients')
      .then(setItems)
      .catch((e: unknown) => setError(errorMessage(e)));
  }, []);

  return (
    <div>
      <PageHeader
        title="My clients"
        subtitle={<>Freelancers who granted you read-only access. Current month: {month}.</>}
      />
      {error && <Alert className="mb-6">{error}</Alert>}
      {items === null && !error && <Loading />}
      {items?.length === 0 && (
        <EmptyState icon={<Briefcase size={26} />} title="No clients yet">
          Access appears here once a freelancer accepts your proposal.{' '}
          <Link to="/directory">Browse the directory</Link> or check your <Link to="/inbox">inbox</Link>.
        </EmptyState>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {items?.map((c) => (
          <div
            key={c.freelancer?.id}
            className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 flex flex-col hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4 mb-5">
              <Avatar name={c.freelancer?.name} seed={c.freelancer?.id} size="lg" />
              <div className="min-w-0">
                <h3 className="font-semibold text-lg text-slate-900 truncate">{c.freelancer?.name}</h3>
                <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                  <CalendarRange size={14} className="shrink-0" />
                  <span>
                    {c.access?.periodStart && formatDate(c.access.periodStart)} to{' '}
                    {c.access?.periodEnd && formatDate(c.access.periodEnd)}
                  </span>
                </p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">This month</p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{formatBrl(c.currentMonthBrl ?? '0')}</p>
              <p className="text-sm text-slate-500">{c.currentMonthUsdc ?? '0'} USDC</p>
            </div>
            {(c.unmatchedCount ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4">
                <AlertTriangle size={16} className="shrink-0" />
                {c.unmatchedCount} unmatched payment{c.unmatchedCount === 1 ? '' : 's'} need attention
              </div>
            )}
            <ButtonLink
              to={`/clients/${c.freelancer?.id}/${month}`}
              variant="emerald"
              className="w-full mt-auto"
              icon={<BarChart3 size={18} />}
            >
              Open report
            </ButtonLink>
          </div>
        ))}
      </div>
    </div>
  );
}
