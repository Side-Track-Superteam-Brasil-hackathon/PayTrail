import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import type { Invoice } from '../../api/types';
import { Alert } from '../../components/Alert';
import { Button, ButtonLink } from '../../components/Button';
import { Card } from '../../components/Card';
import { Field, inputClass } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { useI18n } from '../../i18n/I18nProvider';
import { errorMessage, todayPlusDays } from './format';

export function NewInvoicePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(todayPlusDays(15));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletMissing, setWalletMissing] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setWalletMissing(false);
    setBusy(true);
    try {
      const body: Record<string, string> = {
        clientName: clientName.trim(),
        description: description.trim(),
        network: 'SOLANA',
        baseAmount: Number(amount).toFixed(2),
        dueDate,
      };
      if (clientEmail.trim()) body.clientEmail = clientEmail.trim();
      const inv = await api<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(body) });
      navigate(`/invoices/${inv.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'WALLET_NOT_SET') setWalletMissing(true);
      else if (err instanceof ApiError && err.code === 'NO_UNIQUE_SUFFIX')
        setError(t('finance.newInvoice.noUniqueSuffix'));
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        back={{ to: '/invoices', label: t('finance.invoices.title') }}
        title={t('finance.newInvoice.title')}
        subtitle={t('finance.newInvoice.subtitle')}
      />
      <Card>
        {walletMissing && (
          <Alert tone="warning" className="mb-5">
            {t('finance.newInvoice.walletMissingBefore')}<Link to="/profile">{t('finance.newInvoice.walletMissingLink')}</Link>{t('finance.newInvoice.walletMissingAfter')}
          </Alert>
        )}
        <form onSubmit={submit} className="space-y-5">
          <Field label={t('finance.newInvoice.clientName')}>
            <input className={inputClass} value={clientName} onChange={(e) => setClientName(e.target.value)} required placeholder="Acme Inc" />
          </Field>
          <Field label={t('finance.newInvoice.clientEmail')}>
            <input className={inputClass} type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="billing@acme.com" />
          </Field>
          <Field label={t('finance.newInvoice.description')}>
            <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} required placeholder={t('finance.newInvoice.descriptionPlaceholder')} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label={t('finance.newInvoice.amount')}>
              <input className={inputClass} type="number" inputMode="decimal" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="1500.00" />
            </Field>
            <Field label={t('finance.newInvoice.dueDate')}>
              <input className={inputClass} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </Field>
          </div>
          <div className="flex gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-600">
            <Info size={18} className="text-indigo-500 shrink-0 mt-px" />
            <p>{t('finance.newInvoice.uniqueAmountInfo')}</p>
          </div>
          {error && <Alert>{error}</Alert>}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <ButtonLink to="/invoices" variant="ghost">{t('common.cancel')}</ButtonLink>
            <Button type="submit" variant="accent" disabled={busy}>{busy ? t('finance.newInvoice.creating') : t('finance.newInvoice.create')}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
