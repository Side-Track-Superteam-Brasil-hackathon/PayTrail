import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, ChevronRight, FileText, Plus, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client';
import type { Invoice, InvoiceStatus } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Alert } from '../../components/Alert';
import { ButtonLink } from '../../components/Button';
import { cx } from '../../components/cx';
import { EmptyState } from '../../components/EmptyState';
import { Loading } from '../../components/Loading';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { TBody, THead, Table, Td, Th } from '../../components/Table';
import { formatDate, formatExact, formatUsdc, errorMessage } from './format';
import { StatusBadge } from './StatusBadge';

const FILTERS: { value: InvoiceStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'PARTIALLY_PAID', label: 'Partially paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERPAID', label: 'Overpaid' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const RECEIVED: InvoiceStatus[] = ['PAID', 'OVERPAID', 'PARTIALLY_PAID'];
const OPEN: InvoiceStatus[] = ['OPEN', 'PARTIALLY_PAID'];

/** Sums USDC decimal strings exactly (6 decimal places) and returns a decimal string. */
function sumUsdc(values: (string | undefined)[]): string {
  let micro = 0n;
  for (const v of values) {
    if (!v || !/^-?\d+(\.\d+)?$/.test(v)) continue;
    const neg = v.startsWith('-');
    const [int, frac = ''] = v.replace('-', '').split('.');
    const n = BigInt(int) * 1_000_000n + BigInt(frac.slice(0, 6).padEnd(6, '0'));
    micro += neg ? -n : n;
  }
  const neg = micro < 0n;
  const abs = neg ? -micro : micro;
  return `${neg ? '-' : ''}${abs / 1_000_000n}.${(abs % 1_000_000n).toString().padStart(6, '0')}`;
}

export function InvoicesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<InvoiceStatus | ''>('');
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [all, setAll] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setInvoices(null);
    api<Invoice[]>(`/invoices${filter ? `?status=${filter}` : ''}`)
      .then((r) => {
        if (cancelled) return;
        setInvoices(r);
        if (!filter) setAll(r);
        setError(null);
      })
      .catch((e: unknown) => { if (!cancelled) setError(errorMessage(e)); });
    return () => { cancelled = true; };
  }, [filter]);

  // Summary cards always reflect every invoice, even when the table is filtered.
  const needAll = filter !== '' && all === null;
  useEffect(() => {
    if (!needAll) return;
    let cancelled = false;
    api<Invoice[]>('/invoices')
      .then((r) => { if (!cancelled) setAll(r); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [needAll]);

  const received = all
    ? sumUsdc(all.filter((i) => i.status && RECEIVED.includes(i.status)).map((i) => i.amountPaid))
    : null;
  const openCount = all ? all.filter((i) => i.status && OPEN.includes(i.status)).length : null;

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Issue invoices and track on-chain reconciliation."
        actions={<ButtonLink to="/invoices/new" variant="accent" icon={<Plus size={20} />}>New invoice</ButtonLink>}
      />

      {user && !user.solanaWallet && (
        <Alert tone="warning" className="mb-6">
          You have not set a Solana wallet yet. Add one in your <Link to="/profile">profile</Link> to create invoices.
        </Alert>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <StatCard
          label="Total received"
          value={received == null ? '—' : formatUsdc(received)}
          suffix="USDC"
          icon={<CheckCircle size={24} />}
          tone="emerald"
        />
        <StatCard
          label="Open invoices"
          value={openCount == null ? '—' : openCount}
          icon={<FileText size={24} />}
          tone="amber"
        />
        <StatCard
          label="Shared access"
          value={<span className="text-lg">Accountants</span>}
          icon={<ShieldCheck size={24} />}
          tone="indigo"
          footer={
            <Link to="/accountants" className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800">
              Manage my accountants <ArrowRight size={16} />
            </Link>
          }
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap" role="tablist" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={cx(
              'px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap',
              filter === f.value
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <Alert className="mb-4">{error}</Alert>}
      {!invoices && !error && <Loading />}

      {invoices && invoices.length === 0 && (
        <EmptyState
          icon={<FileText size={26} />}
          title={filter ? 'No invoices with this status' : 'No invoices yet'}
          action={<ButtonLink to="/invoices/new" variant="accent" icon={<Plus size={18} />}>New invoice</ButtonLink>}
        >
          Create your first invoice and share the payment link with your client.
        </EmptyState>
      )}

      {invoices && invoices.length > 0 && (
        <Table>
          <THead>
            <Th>Client</Th>
            <Th num>Amount (USDC)</Th>
            <Th num>Paid</Th>
            <Th num>Balance</Th>
            <Th>Status</Th>
            <Th>Due</Th>
            <Th className="text-right">Details</Th>
          </THead>
          <TBody>
            {invoices.map((i) => (
              <tr
                key={i.id}
                className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                onClick={() => navigate(`/invoices/${i.id}`)}
              >
                <Td className="min-w-[200px]">
                  <Link
                    to={`/invoices/${i.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium text-slate-900 hover:text-indigo-700"
                  >
                    {i.clientName}
                  </Link>
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{i.description}</div>
                </Td>
                <Td num>
                  <div className="font-medium text-slate-900">{formatExact(i.uniqueAmount)}</div>
                  <div className="text-xs text-slate-400">base {formatUsdc(i.baseAmount)}</div>
                </Td>
                <Td num>{formatUsdc(i.amountPaid)}</Td>
                <Td num>{formatUsdc(i.balance)}</Td>
                <Td><StatusBadge status={i.status!} overdue={i.overdue} /></Td>
                <Td className="whitespace-nowrap text-slate-500">{formatDate(i.dueDate)}</Td>
                <Td className="text-right">
                  <span className="inline-flex items-center gap-1 text-indigo-600 font-medium whitespace-nowrap">
                    View <ChevronRight size={16} />
                  </span>
                </Td>
              </tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
