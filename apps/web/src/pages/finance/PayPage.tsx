import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { AlertTriangle, Ban, CheckCircle, FileQuestion, ShieldCheck, Wallet } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import type { PayPageData } from '../../api/types';
import { Alert } from '../../components/Alert';
import { buttonClass } from '../../components/Button';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { Loading } from '../../components/Loading';
import { useI18n } from '../../i18n/I18nProvider';
import { CopyButton } from './CopyButton';
import { errorMessage, formatExact } from './format';
import { usePolling } from './usePolling';

function PublicShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center px-4 py-8 sm:py-12">
      <LanguageSwitcher className="absolute top-4 right-4" />
      <div className="text-2xl font-bold tracking-tight text-indigo-600 mb-6">PayTrail</div>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 flex items-center gap-1.5 text-xs text-slate-400">
        <ShieldCheck size={14} /> {t('pay.secure')}
      </p>
    </div>
  );
}

export function PayPage() {
  const { t } = useI18n();
  const { publicId } = useParams<{ publicId: string }>();
  const [data, setData] = useState<PayPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!publicId) return;
    try {
      setData(await api<PayPageData>(`/pay/${encodeURIComponent(publicId)}`));
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setNotFound(true);
      else setError(errorMessage(e));
    }
  }, [publicId]);

  useEffect(() => { void load(); }, [load]);
  const finished = data?.status === 'PAID' || data?.status === 'OVERPAID' || data?.status === 'CANCELLED';
  usePolling(() => void load(), 4000, !notFound && !finished);

  if (notFound) {
    return (
      <PublicShell>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <FileQuestion size={26} />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">{t('pay.notFoundTitle')}</h2>
          <p className="text-slate-500 mt-1">{t('pay.notFoundText')}</p>
        </div>
      </PublicShell>
    );
  }
  if (!data) {
    return (
      <PublicShell>
        {error ? <Alert>{error}</Alert> : <div className="flex justify-center"><Loading /></div>}
      </PublicShell>
    );
  }

  const paid = data.status === 'PAID' || data.status === 'OVERPAID';
  const amount = formatExact(data.amountToSend);

  return (
    <PublicShell>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 text-center border-b border-slate-100">
          <p className="text-sm text-slate-500">{t('pay.requesting', { name: data.freelancerName })}</p>
          <h1 className="text-xl font-semibold text-slate-900 mt-1 break-words">{data.description}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('pay.billedTo', { name: data.clientName })}</p>
        </div>

        {paid ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle size={44} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{t('pay.receivedTitle')}</h2>
            <p className="text-slate-500 mt-2">{t('pay.receivedText', { name: data.freelancerName })}</p>
          </div>
        ) : data.status === 'CANCELLED' ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
              <Ban size={32} />
            </div>
            <p className="text-red-700 font-medium">{t('pay.cancelled')}</p>
          </div>
        ) : (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center">
              <p className="text-sm font-medium text-slate-500">
                {data.status === 'PARTIALLY_PAID' ? t('pay.sendRemaining') : t('pay.sendExactly')}
              </p>
              <div className="mt-1 text-4xl sm:text-5xl font-bold text-slate-900 tabular-nums break-all">
                {amount}
                <span className="text-xl sm:text-2xl text-slate-400 font-medium ml-2">USDC</span>
              </div>
              <div className="mt-3 flex justify-center">
                <CopyButton text={amount} label={t('pay.copyAmount')} />
              </div>
            </div>

            {data.solanaPayUrl && (
              <div className="space-y-4">
                <div className="mx-auto w-fit p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <QRCodeSVG value={data.solanaPayUrl} size={220} level="M" className="max-w-full h-auto" />
                </div>
                <a className={buttonClass('primary', 'lg', 'w-full')} href={data.solanaPayUrl}>
                  <Wallet size={20} /> {t('pay.openWallet')}
                </a>
              </div>
            )}

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">{t('pay.recipient')}</p>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="font-mono text-sm text-slate-800 break-all flex-1 min-w-0">{data.recipientAddress}</div>
                <CopyButton text={data.recipientAddress} />
              </div>
            </div>

            <div className="flex gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3.5 text-sm">
              <AlertTriangle size={18} className="shrink-0 mt-px" />
              <p>{t('pay.warning')}</p>
            </div>

            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full text-xs font-medium text-slate-500">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-amber-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-amber-500" />
                </span>
                {t('pay.waiting')}
              </span>
            </div>
          </div>
        )}
      </div>
    </PublicShell>
  );
}
