import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, FileJson, Hash, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import type { Receipt } from '../../api/types';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { Card, CardTitle } from '../../components/Card';
import { inputClass } from '../../components/Field';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useI18n } from '../../i18n/I18nProvider';
import { errorMessage } from './format';

interface VerifyHashResponse { valid?: boolean; receipt?: Receipt }
interface VerifyBodyResponse { sha256?: string; valid?: boolean }

function pretty(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

function Verdict({ valid, children }: { valid: boolean; children: string }) {
  return valid ? (
    <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4">
      <CheckCircle size={22} className="shrink-0 text-emerald-600" />
      <p className="font-medium">{children}</p>
    </div>
  ) : (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
      <XCircle size={22} className="shrink-0" />
      <p className="font-medium">{children}</p>
    </div>
  );
}

export function VerifyPage() {
  const { t, locale } = useI18n();
  const { hash } = useParams<{ hash?: string }>();
  const navigate = useNavigate();
  const [hashInput, setHashInput] = useState(hash ?? '');
  const [result, setResult] = useState<VerifyHashResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [pasted, setPasted] = useState('');
  const [pasteResult, setPasteResult] = useState<VerifyBodyResponse | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);

  useEffect(() => {
    setResult(null);
    setNotFound(false);
    setError(null);
    if (!hash) return;
    let cancelled = false;
    setLoading(true);
    api<VerifyHashResponse>(`/verify/${encodeURIComponent(hash)}`)
      .then((r) => { if (!cancelled) setResult(r); })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) setNotFound(true);
        else setError(errorMessage(e));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [hash]);

  const lookup = (e: FormEvent) => {
    e.preventDefault();
    const h = hashInput.trim();
    if (h) navigate(`/verify/${h}`);
  };

  const verifyPasted = async (e: FormEvent) => {
    e.preventDefault();
    setPasteResult(null);
    setPasteError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(pasted);
    } catch {
      setPasteError(t('verify.invalidJson'));
      return;
    }
    try {
      setPasteResult(await api<VerifyBodyResponse>('/verify', { method: 'POST', body: JSON.stringify(parsed) }));
    } catch (err) {
      setPasteError(errorMessage(err));
    }
  };

  return (
    <div className="relative min-h-[100dvh] px-4 py-8 sm:py-12">
      <LanguageSwitcher className="absolute top-4 right-4" />
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <Link to="/" className="text-2xl font-bold tracking-tight text-indigo-600">PayTrail</Link>
          <div className="mx-auto mt-6 w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-4">{t('verify.title')}</h1>
          <p className="text-slate-500 mt-2">{t('verify.subtitle')}</p>
        </div>

        <Card>
          <CardTitle icon={<Hash size={18} />}>{t('verify.byHash')}</CardTitle>
          <form onSubmit={lookup} className="flex flex-col sm:flex-row gap-2">
            <input
              className={`${inputClass} font-mono text-sm`}
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
              placeholder={t('verify.hashPlaceholder')}
              aria-label={t('verify.hashLabel')}
              spellCheck={false}
            />
            <Button type="submit" variant="accent" className="shrink-0">{t('verify.submit')}</Button>
          </form>

          <div className="mt-4 space-y-3 empty:hidden">
            {loading && (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" /> {t('verify.checking')}
              </p>
            )}
            {error && <Alert>{error}</Alert>}
            {notFound && <Verdict valid={false}>{t('verify.notFound')}</Verdict>}
            {result && (
              <>
                {result.valid
                  ? <Verdict valid>{t('verify.valid')}</Verdict>
                  : <Verdict valid={false}>{t('verify.invalid')}</Verdict>}
                {result.receipt && (
                  <>
                    <p className="text-sm text-slate-500 break-all">
                      {t('verify.issued', { date: new Date(result.receipt.createdAt ?? '').toLocaleString(locale) })}
                      {result.receipt.anchorTx ? t('verify.anchored', { tx: result.receipt.anchorTx }) : ''}
                    </p>
                    <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 overflow-x-auto text-xs leading-relaxed">
                      {pretty(result.receipt.canonicalJson ?? '')}
                    </pre>
                  </>
                )}
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle icon={<FileJson size={18} />}>{t('verify.byJson')}</CardTitle>
          <p className="text-sm text-slate-500 -mt-2 mb-4">
            {t('verify.jsonText')}
          </p>
          <form onSubmit={verifyPasted} className="space-y-3">
            <textarea
              rows={8}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              className={`${inputClass} font-mono text-xs`}
              placeholder="{ ... }"
              aria-label={t('verify.jsonLabel')}
              spellCheck={false}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={!pasted.trim()}>{t('verify.submitJson')}</Button>
            </div>
          </form>
          <div className="mt-4 space-y-3 empty:hidden">
            {pasteError && <Alert>{pasteError}</Alert>}
            {pasteResult && (
              <>
                {pasteResult.valid
                  ? <Verdict valid>{t('verify.jsonValid')}</Verdict>
                  : <Verdict valid={false}>{t('verify.jsonInvalid')}</Verdict>}
                {pasteResult.sha256 && <p className="text-xs text-slate-500 font-mono break-all">sha256: {pasteResult.sha256}</p>}
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
