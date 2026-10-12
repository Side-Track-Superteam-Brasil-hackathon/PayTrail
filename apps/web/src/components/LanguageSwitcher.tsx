import { Globe } from 'lucide-react';
import { useI18n, type Lang } from '../i18n/I18nProvider';
import { cx } from './cx';

const OPTIONS: { lang: Lang; short: string }[] = [
  { lang: 'en', short: 'EN' },
  { lang: 'pt', short: 'PT' },
];

/** Seletor de idioma EN/PT. A escolha fica salva no navegador. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div
      role="radiogroup"
      aria-label={t('lang.label')}
      className={cx('inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs', className)}
    >
      <Globe size={14} className="mx-1 text-slate-400 shrink-0" aria-hidden />
      {OPTIONS.map((o) => (
        <button
          key={o.lang}
          type="button"
          role="radio"
          aria-checked={lang === o.lang}
          title={t(`lang.${o.lang}`)}
          onClick={() => setLang(o.lang)}
          className={cx(
            'px-2 py-1 rounded-lg font-semibold transition-colors',
            lang === o.lang ? 'bg-indigo-600 text-[#1b100b]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
          )}
        >
          {o.short}
        </button>
      ))}
    </div>
  );
}
