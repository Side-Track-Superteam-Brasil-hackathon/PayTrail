import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ExternalLink, Link2 } from 'lucide-react';
import { api } from '../../api/client';
import type { Invoice, Payment } from '../../api/types';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { inputBase } from '../../components/Field';
import { Loading } from '../../components/Loading';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { TBody, THead, Table, Td, Th } from '../../components/Table';
import { useI18n } from '../../i18n/I18nProvider';
import { codeLabel, errorMessage, formatDateTime, formatExact, shortAddr } from './format';

export function UnmatchedPage() {
  const { t } = useI18n();
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [a, b, o, p] = await Promise.all([
        api<Payment[]>('/payments?status=UNMATCHED'),
        api<Payment[]>('/payments?status=AMBIGUOUS'),
        api<Invoice[]>('/invoices?status=OPEN'),
        api<Invoice[]>('/invoices?status=PARTIALLY_PAID'),
      ]);
      const all = [...a, ...b].sort((x, y) => (y.blockTime ?? '').localeCompare(x.blockTime ?? ''));
      setPayments(all);
      setInvoices([...o, ...p]);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const match = async (pay: Payment) => {
    const invoiceId = selected[pay.id!];
    if (!invoiceId) return;
    setBusyId(pay.id!);
    setError(null);
    setNotice(null);
    try {
      await api(`/payments/${pay.id}/match`, { method: 'POST', body: JSON.stringify({ invoiceId }) });
      setNotice(t('finance.unmatched.matched', { amount: formatExact(pay.amount) }));
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('finance.unmatched.title')}
        subtitle={t('finance.unmatched.subtitle')}
      />
      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      {!payments && !error && <Loading />}

      {payments && payments.length === 0 && (
        <EmptyState icon={<CheckCircle size={26} />} title={t('finance.unmatched.emptyTitle')}>
          {t('finance.unmatched.emptyText')}
        </EmptyState>
      )}

      {payments && payments.length > 0 && (
        <Table
          footer={
            invoices.length === 0 && (
              <p className="px-6 py-4 text-sm text-slate-500 border-t border-slate-100">
                {t('finance.unmatched.noOpenInvoices')}{' '}
                <Link to="/invoices/new" className="font-medium text-indigo-600 hover:text-indigo-800">{t('finance.unmatched.createOne')}</Link>.
              </p>
            )
          }
        >
          <THead>
            <Th num>USDC</Th><Th>{t('finance.unmatched.colFrom')}</Th><Th>{t('finance.unmatched.colTime')}</Th>
            <Th>{t('finance.unmatched.colReason')}</Th><Th>{t('finance.unmatched.colTx')}</Th><Th>{t('finance.unmatched.colMatch')}</Th>
          </THead>
          <TBody>
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/50">
                <Td num className="font-semibold text-slate-900">{formatExact(p.amount)}</Td>
                <Td className="font-mono text-xs">{shortAddr(p.fromAddress)}</Td>
                <Td className="whitespace-nowrap">{formatDateTime(p.blockTime)}</Td>
                <Td>
                  <div className="flex flex-col items-start gap-1">
                    <Pill tone={p.status === 'AMBIGUOUS' ? 'violet' : 'amber'}>
                      {p.status === 'AMBIGUOUS' ? t('finance.unmatched.ambiguous') : t('finance.unmatched.unmatched')}
                    </Pill>
                    {p.unmatchedReason && <span className="text-xs text-slate-500">{codeLabel('finance.reason', p.unmatchedReason)}</span>}
                  </div>
                </Td>
                <Td>
                  {p.explorerUrl ? (
                    <a href={p.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800 whitespace-nowrap">
                      {shortAddr(p.txHash)} <ExternalLink size={14} />
                    </a>
                  ) : shortAddr(p.txHash)}
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <select
                      value={selected[p.id!] ?? ''}
                      onChange={(e) => setSelected((s) => ({ ...s, [p.id!]: e.target.value }))}
                      aria-label={t('finance.unmatched.invoice')}
                      className={`${inputBase} px-3 py-2 text-sm w-56`}
                    >
                      <option value="">{t('finance.unmatched.selectInvoice')}</option>
                      {invoices.map((i) => (
                        <option key={i.id} value={i.id}>{i.clientName} — {i.description} ({t('finance.unmatched.due', { amount: formatExact(i.balance) })})</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="accent"
                      disabled={!selected[p.id!] || busyId === p.id}
                      onClick={() => void match(p)}
                      icon={<Link2 size={16} />}
                    >
                      {busyId === p.id ? '…' : t('finance.unmatched.match')}
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
