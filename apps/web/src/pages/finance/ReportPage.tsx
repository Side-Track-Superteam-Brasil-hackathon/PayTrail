import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BarChart3, Banknote, Coins, Download, ExternalLink, Lock, Receipt } from 'lucide-react';
import { api, ApiError, getToken } from '../../api/client';
import type { MonthlyReport } from '../../api/types';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { inputBase } from '../../components/Field';
import { Loading } from '../../components/Loading';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { TBody, THead, Table, Td, Th } from '../../components/Table';
import { useI18n } from '../../i18n/I18nProvider';
import {
  currentMonth, errorMessage, formatBrl, formatDate, formatDateTime, formatRate, formatUsdc, shortAddr,
} from './format';

export function ReportPage() {
  const { t } = useI18n();
  const { freelancerId, month: monthParam } = useParams<{ freelancerId?: string; month?: string }>();
  const navigate = useNavigate();
  const [localMonth, setLocalMonth] = useState(currentMonth());
  const month = monthParam ?? localMonth;
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noAccess, setNoAccess] = useState(false);
  const [exporting, setExporting] = useState(false);

  const query = `month=${encodeURIComponent(month)}${freelancerId ? `&freelancerId=${encodeURIComponent(freelancerId)}` : ''}`;

  useEffect(() => {
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    let cancelled = false;
    setReport(null);
    setError(null);
    setNoAccess(false);
    api<MonthlyReport>(`/reports/monthly?${query}`)
      .then((r) => { if (!cancelled) setReport(r); })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 403) setNoAccess(true);
        else setError(errorMessage(e));
      });
    return () => { cancelled = true; };
  }, [query, month]);

  const changeMonth = (m: string) => {
    if (!m) return;
    if (freelancerId) navigate(`/clients/${freelancerId}/${m}`);
    else setLocalMonth(m);
  };

  const exportCsv = async () => {
    setExporting(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(`/api/reports/monthly.csv?${query}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 403) { setNoAccess(true); return; }
      if (!res.ok) throw new Error(t('report.exportFailed', { status: res.status }));
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `paytrail-report-${month}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        back={freelancerId ? { to: '/clients', label: t('nav.myClients') } : undefined}
        title={t('report.title')}
        subtitle={t('report.subtitle')}
        actions={
          <>
            <input
              type="month"
              value={month}
              onChange={(e) => changeMonth(e.target.value)}
              aria-label={t('report.month')}
              className={`${inputBase} px-3 py-2`}
            />
            <Button
              onClick={() => void exportCsv()}
              disabled={exporting || noAccess}
              icon={<Download size={18} />}
            >
              {exporting ? t('report.exporting') : t('report.exportCsv')}
            </Button>
          </>
        }
      />

      {noAccess && (
        <EmptyState icon={<Lock size={26} />} title={t('report.noAccessTitle')}>
          {t('report.noAccessText')}
        </EmptyState>
      )}
      {error && <Alert>{error}</Alert>}
      {!report && !error && !noAccess && <Loading />}

      {report && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <StatCard label={t('report.totalUsdc')} value={formatUsdc(report.totalUsdc)} suffix="USDC" icon={<Coins size={24} />} tone="indigo" />
            <StatCard label={t('report.totalBrl')} value={formatBrl(report.totalBrl)} icon={<Banknote size={24} />} tone="emerald" />
            <StatCard label={t('report.payments')} value={report.rows?.length ?? 0} icon={<Receipt size={24} />} tone="slate" />
          </div>

          {(report.unmatchedCount ?? 0) > 0 && (
            <Alert tone="warning">
              {t(report.unmatchedCount === 1 ? 'report.unmatchedOne' : 'report.unmatchedOther', { count: report.unmatchedCount ?? 0 })}
              {!freelancerId && <> <Link to="/payments/unmatched">{t('report.reviewThem')}</Link>.</>}
            </Alert>
          )}

          {(report.rows?.length ?? 0) === 0 ? (
            <EmptyState icon={<BarChart3 size={26} />} title={t('report.emptyTitle', { month })}>
              {t('report.emptyText')}
            </EmptyState>
          ) : (
            <Table>
              <THead>
                <Th>{t('report.colDate')}</Th><Th>{t('report.colClient')}</Th><Th>{t('report.colInvoice')}</Th>
                <Th>{t('report.colTx')}</Th><Th num>{t('report.colUsdc')}</Th>
                <Th>{t('report.colFxRule')}</Th><Th>{t('report.colFxDate')}</Th>
                <Th num>{t('report.colRate')}</Th><Th num>{t('report.colBrl')}</Th>
              </THead>
              <TBody>
                {report.rows!.map((r, i) => (
                  <tr key={`${r.txHash}-${i}`} className="hover:bg-slate-50/50">
                    <Td className="whitespace-nowrap">{formatDateTime(r.date)}</Td>
                    <Td className="font-medium text-slate-900 whitespace-nowrap">{r.clientName}</Td>
                    <Td className="font-mono text-xs">{r.invoicePublicId}</Td>
                    <Td>
                      {r.explorerUrl ? (
                        <a href={r.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800 whitespace-nowrap">
                          {shortAddr(r.txHash)} <ExternalLink size={14} />
                        </a>
                      ) : shortAddr(r.txHash)}
                    </Td>
                    <Td num className="font-medium text-slate-900">{formatUsdc(r.amountUsdc)}</Td>
                    <Td className="whitespace-nowrap">{r.fxRule === 'CARNE_LEAO' ? t('report.ruleCarneLeao') : t('report.rulePtaxDay')}</Td>
                    <Td className="whitespace-nowrap">{formatDate(r.fxDate)}</Td>
                    <Td num>{formatRate(r.fxRate)}</Td>
                    <Td num className="font-medium text-slate-900">{formatBrl(r.amountBrl)}</Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </>
      )}
    </div>
  );
}
