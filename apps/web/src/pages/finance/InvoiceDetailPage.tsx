import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Ban, CheckCircle, Clock, Coins, ExternalLink, FileCheck2, History, Link2, Scale, Target, Wallet,
} from 'lucide-react';
import { api, ApiError } from '../../api/client';
import type { InvoiceDetail, Receipt } from '../../api/types';
import { Alert } from '../../components/Alert';
import { Button, ButtonLink, buttonClass } from '../../components/Button';
import { Card, CardTitle } from '../../components/Card';
import { inputClass } from '../../components/Field';
import { Loading } from '../../components/Loading';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { TBody, THead, Table, Td, Th } from '../../components/Table';
import { useI18n } from '../../i18n/I18nProvider';
import { CopyButton } from './CopyButton';
import {
  codeLabel, errorMessage, formatBrl, formatDate, formatDateTime, formatExact, formatRate, formatUsdc, shortAddr,
} from './format';
import { MethodBadge, StatusBadge } from './StatusBadge';
import { usePolling } from './usePolling';

function payLink(inv: InvoiceDetail): string {
  const p = inv.payUrl ?? `/pay/${inv.publicId}`;
  return p.startsWith('http') ? p : `${window.location.origin}${p.startsWith('/') ? '' : '/'}${p}`;
}

export function InvoiceDetailPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const [inv, setInv] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setInv(await api<InvoiceDetail>(`/invoices/${id}`));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);
  usePolling(() => void load(), 5000, inv?.status === 'OPEN' || inv?.status === 'PARTIALLY_PAID');

  const cancel = async () => {
    if (!inv || !window.confirm(t('finance.detail.cancelConfirm'))) return;
    setBusy(true);
    setActionError(null);
    try {
      await api(`/invoices/${inv.id}/cancel`, { method: 'POST' });
      await load();
    } catch (e) {
      setActionError(e instanceof ApiError && e.code === 'INVOICE_HAS_PAYMENTS'
        ? t('finance.detail.hasPayments') : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const genReceipt = async () => {
    if (!inv) return;
    setBusy(true);
    setActionError(null);
    try {
      setReceipt(await api<Receipt>(`/invoices/${inv.id}/receipt`, { method: 'POST' }));
      await load();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (error && !inv) {
    return (
      <Alert>
        {error} <Link to="/invoices">{t('finance.detail.backToInvoices')}</Link>
      </Alert>
    );
  }
  if (!inv) return <Loading />;

  const payments = inv.payments ?? [];
  const events = inv.events ?? [];
  const status = inv.status!;
  const hasExcess = inv.excess != null && Number(inv.excess) > 0;
  const canCancel = status === 'OPEN' && payments.length === 0;
  const canReceipt = payments.length > 0 && status !== 'CANCELLED';
  const link = payLink(inv);
  const verifyLink = receipt ? (receipt.verifyUrl?.startsWith('http') ? receipt.verifyUrl : `${window.location.origin}/verify/${receipt.sha256}`) : '';

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ to: '/invoices', label: t('finance.invoices.title') }}
        title={inv.description}
        meta={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-500">
            <StatusBadge status={status} overdue={inv.overdue} />
            <span className="break-all">
              {inv.clientName}{inv.clientEmail ? ` · ${inv.clientEmail}` : ''} · {t('finance.detail.due', { date: formatDate(inv.dueDate) })}
            </span>
          </div>
        }
        actions={
          <>
            {canReceipt && (
              <Button onClick={genReceipt} disabled={busy} icon={<FileCheck2 size={18} />}>{t('finance.detail.generateReceipt')}</Button>
            )}
            {canCancel && (
              <Button variant="danger" onClick={cancel} disabled={busy} icon={<Ban size={18} />}>{t('finance.detail.cancelInvoice')}</Button>
            )}
          </>
        }
      />

      {actionError && <Alert>{actionError}</Alert>}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label={t('finance.detail.exactAmount')} value={formatExact(inv.uniqueAmount)} suffix="USDC" icon={<Target size={22} />} tone="indigo" highlight />
        <StatCard label={t('finance.detail.baseAmount')} value={formatUsdc(inv.baseAmount)} suffix="USDC" icon={<Coins size={22} />} tone="slate" />
        <StatCard label={t('finance.detail.paid')} value={formatUsdc(inv.amountPaid)} suffix="USDC" icon={<CheckCircle size={22} />} tone="emerald" />
        <StatCard label={t('finance.detail.balance')} value={formatUsdc(inv.balance)} suffix="USDC" icon={<Scale size={22} />} tone="amber" />
        {hasExcess && <StatCard label={t('finance.detail.excess')} value={formatUsdc(inv.excess)} suffix="USDC" icon={<Wallet size={22} />} tone="blue" />}
      </div>

      {receipt && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardTitle icon={<FileCheck2 size={18} className="text-emerald-600" />}>{t('finance.detail.receiptGenerated')}</CardTitle>
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">SHA-256</div>
          <div className="font-mono text-sm text-slate-800 break-all mt-1">{receipt.sha256}</div>
          <div className="flex flex-wrap gap-2 mt-4">
            <ButtonLink to={`/verify/${receipt.sha256}`} size="sm">{t('finance.detail.openVerify')}</ButtonLink>
            <CopyButton text={verifyLink} label={t('finance.detail.copyVerifyLink')} />
            <CopyButton text={receipt.sha256 ?? ''} label={t('finance.detail.copyHash')} />
          </div>
        </Card>
      )}

      <Card>
        <CardTitle icon={<Link2 size={18} />}>{t('finance.detail.paymentLink')}</CardTitle>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className={`${inputClass} bg-slate-50 font-mono text-sm`}
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            aria-label={t('finance.detail.paymentLink')}
          />
          <div className="flex gap-2 shrink-0">
            <CopyButton text={link} />
            <a className={buttonClass('secondary', 'sm')} href={link} target="_blank" rel="noreferrer">
              <ExternalLink size={16} /> {t('finance.detail.open')}
            </a>
          </div>
        </div>
      </Card>

      <div>
        <h3 className="flex items-center gap-2 font-semibold text-slate-900 mb-3">
          <Wallet size={18} className="text-slate-400" /> {t('finance.detail.payments')}
        </h3>
        {payments.length === 0 ? (
          <Card className="flex items-center gap-3 text-sm text-slate-500">
            <Clock size={18} className="text-amber-500 shrink-0" />
            {t('finance.detail.noPayments')}
          </Card>
        ) : (
          <Table>
            <THead>
              <Th num>USDC</Th><Th>{t('finance.detail.colMethod')}</Th><Th num>BRL</Th><Th>{t('finance.detail.colFx')}</Th>
              <Th>{t('finance.detail.colFrom')}</Th><Th>{t('finance.detail.colTx')}</Th><Th>{t('finance.detail.colTime')}</Th>
            </THead>
            <TBody>
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <Td num className="font-medium text-slate-900">{formatExact(p.amount)}</Td>
                  <Td><MethodBadge method={p.matchMethod} /></Td>
                  <Td num>{formatBrl(p.amountBrl)}</Td>
                  <Td className="whitespace-nowrap">
                    {p.fxRule ? (
                      <>
                        <div className="text-slate-900">{p.fxRule === 'CARNE_LEAO' ? t('finance.detail.fxCarneLeao') : t('finance.detail.fxPtaxDay')}</div>
                        <div className="text-xs text-slate-500">{formatDate(p.fxDate)} · {formatRate(p.fxRate)}</div>
                      </>
                    ) : '—'}
                  </Td>
                  <Td className="font-mono text-xs">{shortAddr(p.fromAddress)}</Td>
                  <Td>
                    {p.explorerUrl ? (
                      <a href={p.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800 whitespace-nowrap">
                        {shortAddr(p.txHash)} <ExternalLink size={14} />
                      </a>
                    ) : shortAddr(p.txHash)}
                  </Td>
                  <Td className="whitespace-nowrap">{formatDateTime(p.blockTime)}</Td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      <Card>
        <CardTitle icon={<History size={18} />}>{t('finance.detail.trail')}</CardTitle>
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">{t('finance.detail.noEvents')}</p>
        ) : (
          <ol className="relative border-l-2 border-slate-200 ml-1.5 space-y-5">
            {events.map((ev, idx) => (
              <li key={`${ev.createdAt}-${idx}`} className="pl-5 relative">
                <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-indigo-50" />
                <div className="font-medium text-slate-900">{codeLabel('finance.event', ev.type ?? '')}</div>
                <div className="text-xs text-slate-500">{formatDateTime(ev.createdAt)}</div>
                {ev.payload && Object.keys(ev.payload).length > 0 && (
                  <div className="text-xs text-slate-500 mt-1 break-all">
                    {Object.entries(ev.payload as Record<string, unknown>)
                      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                      .join(' · ')}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
