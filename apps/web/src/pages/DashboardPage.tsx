import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BarChart3, Briefcase, CheckCircle, FilePlus2, FileText, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { AccountantAccess, Invoice, Payment, PublicProfile } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Alert } from '../components/Alert';
import { ButtonLink } from '../components/Button';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { formatBrl, formatDate, formatUsdc, errorMessage } from './finance/format';
import { currentMonth, formatBrl as formatMarketBrl } from './market/time';

interface ClientRow {
  freelancer?: PublicProfile;
  access?: AccountantAccess;
  currentMonthUsdc?: string;
  currentMonthBrl?: string;
  unmatchedCount?: number;
}

function sumUsdc(values: (string | undefined)[]): string {
  let micros = 0n;
  for (const value of values) {
    if (!value || !/^\d+(\.\d+)?$/.test(value)) continue;
    const [integer, fraction = ''] = value.split('.');
    micros += BigInt(integer) * 1_000_000n + BigInt(fraction.slice(0, 6).padEnd(6, '0'));
  }
  return `${micros / 1_000_000n}.${(micros % 1_000_000n).toString().padStart(6, '0')}`;
}

function sumBrl(values: (string | null | undefined)[]): string {
  const cents = values.reduce((total, value) => {
    if (!value || !/^\d+(\.\d+)?$/.test(value)) return total;
    const [integer, fraction = ''] = value.split('.');
    return total + BigInt(integer) * 100n + BigInt(fraction.slice(0, 2).padEnd(2, '0'));
  }, 0n);
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
}

function FreelancerDashboard() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<Invoice[]>('/invoices'), api<Payment[]>('/payments')])
      .then(([invoiceData, paymentData]) => {
        setInvoices(invoiceData);
        setPayments(paymentData);
      })
      .catch((e: unknown) => setError(errorMessage(e)));
  }, []);

  const receivedUsdc = useMemo(
    () => sumUsdc((payments ?? []).filter((p) => p.status === 'MATCHED').map((p) => p.amount)),
    [payments],
  );
  const receivedBrl = useMemo(
    () => sumBrl((payments ?? []).filter((p) => p.status === 'MATCHED').map((p) => p.amountBrl)),
    [payments],
  );
  const openInvoices = invoices?.filter((i) => i.status === 'OPEN' || i.status === 'PARTIALLY_PAID').length ?? 0;
  const pendingPayments = payments?.filter((p) => p.status === 'UNMATCHED' || p.status === 'AMBIGUOUS').length ?? 0;
  const recentPayments = [...(payments ?? [])].sort((a, b) => (b.blockTime ?? '').localeCompare(a.blockTime ?? '')).slice(0, 5);

  return (
    <div>
      <PageHeader
        title={`Good morning, ${user?.name?.split(' ')[0] ?? 'there'}`}
        subtitle="Keep your USDC income organized and ready for your accountant."
        actions={<ButtonLink to="/invoices/new" variant="accent" icon={<FilePlus2 size={18} />}>New invoice</ButtonLink>}
      />

      {!user?.solanaWallet && (
        <Alert tone="warning" className="mb-6">
          Add your Solana wallet to start receiving payments. <Link to="/profile">Complete your profile</Link>.
        </Alert>
      )}
      {error && <Alert className="mb-6">{error}</Alert>}
      {!invoices && !error && <Loading />}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Received" value={formatUsdc(receivedUsdc)} suffix="USDC" icon={<CheckCircle size={22} />} tone="emerald" />
        <StatCard label="Converted" value={formatBrl(receivedBrl)} icon={<BarChart3 size={22} />} tone="indigo" />
        <StatCard label="Open invoices" value={openInvoices} icon={<FileText size={22} />} tone="amber" />
        <StatCard label="Needs attention" value={pendingPayments} icon={<AlertTriangle size={22} />} tone="red" />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="font-semibold text-slate-900">Recent payments</h3>
              <p className="text-sm text-slate-500 mt-1">Your latest on-chain activity.</p>
            </div>
            <Link to="/reports" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">View report</Link>
          </div>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-slate-500 py-6">No payments yet. Create an invoice to get started.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{payment.status === 'MATCHED' ? 'Payment reconciled' : 'Payment needs review'}</p>
                    <p className="text-xs text-slate-500 mt-1">{formatDate(payment.blockTime)} · {payment.matchMethod ?? 'No match yet'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-slate-900">{formatUsdc(payment.amount)} USDC</p>
                    <p className="text-xs text-slate-500">{formatBrl(payment.amountBrl)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
          <h3 className="font-semibold text-slate-900">Next steps</h3>
          <p className="text-sm text-slate-500 mt-1 mb-5">Keep your PayTrail workspace ready.</p>
          <div className="space-y-3">
            <Link to="/invoices/new" className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors">
              <FilePlus2 size={18} className="text-indigo-600" />
              <span className="flex-1 text-sm font-medium text-slate-800">Create an invoice</span>
              <ArrowRight size={16} className="text-slate-400" />
            </Link>
            <Link to="/directory" className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors">
              <Search size={18} className="text-indigo-600" />
              <span className="flex-1 text-sm font-medium text-slate-800">Find an accountant</span>
              <ArrowRight size={16} className="text-slate-400" />
            </Link>
            {pendingPayments > 0 && (
              <Link to="/payments/unmatched" className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 hover:bg-amber-50 transition-colors">
                <AlertTriangle size={18} className="text-amber-600" />
                <span className="flex-1 text-sm font-medium text-amber-900">Review unmatched payments</span>
                <ArrowRight size={16} className="text-amber-600" />
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function AccountantDashboard() {
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const month = currentMonth();

  useEffect(() => {
    api<ClientRow[]>('/accountant/clients')
      .then(setClients)
      .catch((e: unknown) => setError(errorMessage(e)));
  }, []);

  const totalBrl = sumBrl((clients ?? []).map((client) => client.currentMonthBrl));
  const totalUsdc = sumUsdc((clients ?? []).map((client) => client.currentMonthUsdc));
  const unmatched = (clients ?? []).reduce((total, client) => total + (client.unmatchedCount ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Accountant overview"
        subtitle={`Your clients' activity for ${month}.`}
        actions={<ButtonLink to="/directory" variant="emerald" icon={<Search size={18} />}>Find clients</ButtonLink>}
      />
      {error && <Alert className="mb-6">{error}</Alert>}
      {!clients && !error && <Loading />}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Clients" value={clients?.length ?? 0} icon={<Briefcase size={22} />} tone="emerald" />
        <StatCard label="This month" value={formatMarketBrl(totalBrl)} icon={<BarChart3 size={22} />} tone="indigo" />
        <StatCard label="USDC tracked" value={formatUsdc(totalUsdc)} suffix="USDC" icon={<CheckCircle size={22} />} tone="emerald" />
        <StatCard label="Needs attention" value={unmatched} icon={<AlertTriangle size={22} />} tone="red" />
      </div>
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <h3 className="font-semibold text-slate-900">Client activity</h3>
        <p className="text-sm text-slate-500 mt-1 mb-5">Open a report to review a client's monthly records.</p>
        {clients?.length === 0 ? (
          <p className="text-sm text-slate-500 py-6">No clients yet. Browse the directory to start connecting.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {clients?.slice(0, 5).map((client) => (
              <Link key={client.freelancer?.id} to={`/clients/${client.freelancer?.id}/${month}`} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0 hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 truncate">{client.freelancer?.name ?? 'Client'}</p>
                  <p className="text-xs text-slate-500 mt-1">{formatUsdc(client.currentMonthUsdc)} USDC this month</p>
                </div>
                <p className="font-semibold text-slate-900">{formatMarketBrl(client.currentMonthBrl ?? '0')}</p>
                <ArrowRight size={16} className="text-slate-400" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  return user?.role === 'ACCOUNTANT' ? <AccountantDashboard /> : <FreelancerDashboard />;
}
