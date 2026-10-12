import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Briefcase, FileText, Landmark, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useI18n } from '../i18n/I18nProvider';
import type { MessageKey } from '../i18n/messages';

const FEATURES: { icon: ReactNode; title: MessageKey; text: MessageKey }[] = [
  { icon: <QrCode size={22} />, title: 'landing.f1Title', text: 'landing.f1Text' },
  { icon: <RefreshCw size={22} />, title: 'landing.f2Title', text: 'landing.f2Text' },
  { icon: <Landmark size={22} />, title: 'landing.f3Title', text: 'landing.f3Text' },
  { icon: <BadgeCheck size={22} />, title: 'landing.f4Title', text: 'landing.f4Text' },
];

const STEPS: { title: MessageKey; text: MessageKey }[] = [
  { title: 'landing.s1Title', text: 'landing.s1Text' },
  { title: 'landing.s2Title', text: 'landing.s2Text' },
  { title: 'landing.s3Title', text: 'landing.s3Text' },
];

const primaryCta =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-900/30 hover:bg-indigo-500 transition-colors';
const secondaryCta =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white hover:bg-white/10 transition-colors';

/** Página inicial pública (specs/00 §Decisões fixadas). Usuário logado é redirecionado antes de chegar aqui. */
export function LandingPage() {
  const { t } = useI18n();

  return (
    <div className="auth-page min-h-[100dvh] text-white">
      <header className="max-w-6xl mx-auto flex items-center justify-between gap-3 px-4 py-5 md:px-8">
        <Link to="/" className="text-2xl font-bold tracking-tight text-white">
          Pay<span className="text-orange-400">Trail</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <Link to="/login" className="hidden sm:inline-flex px-3 py-2 text-sm font-semibold text-slate-200 hover:text-white">
            {t('landing.login')}
          </Link>
          <Link to="/register" className="inline-flex rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400">
            {t('landing.getStarted')}
          </Link>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-4 pt-12 pb-16 md:px-8 md:pt-20 md:pb-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-300">
              <ShieldCheck size={14} /> {t('landing.badge')}
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              {t('landing.title')}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-300">{t('landing.subtitle')}</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className={primaryCta}>
                {t('landing.ctaPrimary')} <ArrowRight size={18} />
              </Link>
              <Link to="/login" className={secondaryCta}>
                {t('landing.ctaSecondary')}
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-16 md:px-8">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('landing.featuresTitle')}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 text-orange-300">
                  {f.icon}
                </div>
                <h3 className="mt-4 font-semibold text-white">{t(f.title)}</h3>
                <p className="mt-2 text-sm text-slate-300">{t(f.text)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-16 md:px-8">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('landing.stepsTitle')}</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-white">{t(s.title)}</h3>
                  <p className="mt-1 text-sm text-slate-300">{t(s.text)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-20 md:px-8">
          <div className="flex flex-col gap-6 rounded-3xl border border-emerald-400/20 bg-emerald-950/40 p-6 backdrop-blur sm:p-10 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                <Briefcase size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold sm:text-2xl">{t('landing.accountantTitle')}</h2>
                <p className="mt-2 max-w-xl text-slate-300">{t('landing.accountantText')}</p>
              </div>
            </div>
            <Link
              to="/register"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-500"
            >
              {t('landing.accountantCta')} <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col gap-3 px-4 py-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <span>{t('landing.footer')}</span>
          <Link to="/verify" className="inline-flex items-center gap-1.5 hover:text-white">
            <FileText size={16} /> {t('landing.verify')}
          </Link>
        </div>
      </footer>
    </div>
  );
}
