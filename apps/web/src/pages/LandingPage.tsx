import { ArrowRight, BarChart3, Check, FileCheck2, Link2, Menu, ShieldCheck, WalletCards, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeToggle } from '../components/ThemeToggle';
import { useI18n } from '../i18n/I18nProvider';
import type { MessageKey } from '../i18n/messages';
import { useTheme } from '../theme/ThemeContext';

const FEATURES: { icon: typeof Link2; title: MessageKey; description: MessageKey }[] = [
  { icon: Link2, title: 'landing.f1Title', description: 'landing.f1Text' },
  { icon: BarChart3, title: 'landing.f2Title', description: 'landing.f2Text' },
  { icon: FileCheck2, title: 'landing.f3Title', description: 'landing.f3Text' },
];

export function LandingPage() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const isLight = theme === 'light';

  const shellClasses = isLight
    ? 'min-h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(191,224,240,0.9),_rgba(223,238,247,0.88)_28%,_rgba(188,220,234,0.8)_52%,_rgba(174,206,228,0.9)_100%)] text-[#001d39]'
    : 'min-h-[100dvh] overflow-hidden bg-[#0a0b10] text-white';

  const navText = isLight ? 'text-[#0a4174]/75' : 'text-white/65';
  const navHover = isLight ? 'hover:text-[#001d39]' : 'hover:text-white';
  const accentBg = isLight ? 'bg-[#001d39]' : 'bg-[#ff8a4c]';
  const accentHover = isLight ? 'hover:bg-[#0a4174]' : 'hover:bg-[#ffa06e]';
  const badgeClasses = isLight
    ? 'border border-[#0a4174]/10 bg-white/70 text-[#0a4174] shadow-[0_10px_30px_rgba(10,65,116,0.06)]'
    : 'border border-[#ffb078]/25 bg-[#ffb078]/10 text-[#ffc39e]';
  const badgeDot = isLight ? 'bg-[#0a4174]' : 'bg-[#ff9a63]';
  const titleHighlight = isLight ? 'text-[#001d39]' : 'text-[#ff9a63]';
  const bodyMuted = isLight ? 'text-[#123d66]/75' : 'text-white/60';
  const panelClasses = isLight
    ? 'border border-[#0a4174]/10 bg-white/60 backdrop-blur-xl shadow-[0_25px_70px_rgba(12,48,79,0.12)]'
    : 'border border-white/15 bg-[#15151d]/90 shadow-2xl backdrop-blur';
  const lightButton = isLight
    ? 'bg-[#001d39] text-white shadow-[0_14px_36px_rgba(0,29,57,0.18)] hover:bg-[#0a4174]'
    : 'bg-[#ff8a4c] text-[#1b100b] shadow-[0_8px_30px_rgba(255,138,76,0.25)] hover:bg-[#ffa06e]';
  const lightSecondary = isLight
    ? 'border border-[#0a4174]/15 bg-white/65 text-[#001d39] hover:border-[#0a4174]/25 hover:text-[#001d39]'
    : 'border border-white/15 text-white/80 hover:border-white/30 hover:text-white';
  const chipClasses = isLight ? 'bg-[#edf7fc] text-[#0a4174]' : 'bg-[#ff8a4c]/15 text-[#ffb58d]';
  const cardSubtle = isLight ? 'bg-[#edf6ff]/90 border border-[#d9ebf7]' : 'bg-white/[0.06]';
  const cardIcon = isLight ? 'bg-[#dfeef7] text-[#0a4174]' : 'bg-[#ff8a4c]/15 text-[#ff9a63]';
  const tinyMuted = isLight ? 'text-[#0a4174]/65' : 'text-white/45';
  const sectionCard = isLight ? 'rounded-2xl border border-[#0a4174]/10 bg-white/65 p-6 shadow-[0_18px_40px_rgba(10,65,116,0.06)]' : 'rounded-2xl border border-white/10 bg-[#111219] p-6';
  const sectionMuted = isLight ? 'text-[#123d66]/70' : 'text-white/55';
  const sectionTitle = isLight ? 'text-[#001d39]' : 'text-white';

  return (
    <div className={shellClasses}>
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${isLight ? 'border-[#0a4174]/10 bg-[#edf5ff] text-[#001d39] shadow-[0_0_20px_rgba(0,29,57,0.08)]' : 'border-transparent bg-[#ff8a4c] shadow-[0_0_24px_rgba(255,138,76,0.35)] text-white'}`}>
            <WalletCards size={19} strokeWidth={2.5} />
          </span>
          <span className={`text-xl font-semibold tracking-tight ${isLight ? 'text-[#001d39]' : 'text-white'}`}>PayTrail</span>
        </Link>

        <nav className={`hidden items-center gap-5 text-sm md:flex ${navText}`} aria-label={t('landing.nav')}>
          <a href="#how-it-works" className={`transition-colors ${navHover}`}>{t('landing.howItWorks')}</a>
          <a href="#features" className={`transition-colors ${navHover}`}>{t('landing.features')}</a>
          <Link to="/login" className={`transition-colors ${navHover}`}>{t('landing.login')}</Link>
          <ThemeToggle compact darkSurface />
          <Link to="/register" className={`rounded-xl px-4 py-2.5 font-medium text-white transition ${accentBg} ${accentHover}`}>
            {t('landing.getStarted')}
          </Link>
          <LanguageSwitcher />
        </nav>

        <button
          type="button"
          className={isLight ? 'rounded-lg p-2 text-[#001d39]/80 md:hidden' : 'rounded-lg p-2 text-white/75 md:hidden'}
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {menuOpen && (
        <nav className={isLight ? 'relative z-10 mx-5 rounded-2xl border border-[#0a4174]/10 bg-white/60 p-4 backdrop-blur-md md:hidden' : 'relative z-10 mx-5 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur md:hidden'} aria-label={t('landing.navMobile')}>
          <div className="flex flex-col gap-1 text-sm">
            <a href="#how-it-works" className={isLight ? 'rounded-lg px-3 py-2.5 text-[#0a4174]/75 hover:bg-[#edf7fc] hover:text-[#001d39]' : 'rounded-lg px-3 py-2.5 text-white/75 hover:bg-white/10 hover:text-white'} onClick={() => setMenuOpen(false)}>{t('landing.howItWorks')}</a>
            <a href="#features" className={isLight ? 'rounded-lg px-3 py-2.5 text-[#0a4174]/75 hover:bg-[#edf7fc] hover:text-[#001d39]' : 'rounded-lg px-3 py-2.5 text-white/75 hover:bg-white/10 hover:text-white'} onClick={() => setMenuOpen(false)}>{t('landing.features')}</a>
            <Link to="/login" className={isLight ? 'rounded-lg px-3 py-2.5 text-[#0a4174]/75 hover:bg-[#edf7fc] hover:text-[#001d39]' : 'rounded-lg px-3 py-2.5 text-white/75 hover:bg-white/10 hover:text-white'}>{t('landing.login')}</Link>
            <Link to="/register" className={`mt-2 rounded-xl px-3 py-2.5 text-center font-medium text-white transition ${accentBg} ${accentHover}`}>{t('landing.getStarted')}</Link>
            <div className="mt-2 flex items-center justify-between">
              <LanguageSwitcher />
              <ThemeToggle compact darkSurface />
            </div>
          </div>
        </nav>
      )}

      <main>
        <section className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:pb-32 lg:pt-28">
          <div className={isLight ? 'pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-[#dfeef7]/70 blur-3xl' : 'pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-[#e9612c]/20 blur-3xl'} />
          <div className={isLight ? 'pointer-events-none absolute right-0 top-20 h-80 w-80 rounded-full bg-[#7bbde8]/30 blur-3xl' : 'pointer-events-none absolute right-0 top-20 h-80 w-80 rounded-full bg-[#7048ff]/15 blur-3xl'} />
          <div className="relative grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className={`mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium ${badgeClasses}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${badgeDot}`} />
                {t('landing.badge')}
              </div>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] text-[#001d39] sm:text-6xl lg:text-7xl">
                {t('landing.titleStart')} <span className={titleHighlight}>{t('landing.titleHighlight')}</span>
              </h1>
              <p className={`mt-7 max-w-xl text-lg leading-8 sm:text-xl ${bodyMuted}`}>
                {t('landing.subtitle')}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/register" className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 font-medium transition ${lightButton}`}>
                  {t('landing.ctaPrimary')} <ArrowRight size={18} />
                </Link>
                <a href="#how-it-works" className={`inline-flex items-center justify-center rounded-xl px-5 py-3.5 font-medium transition ${lightSecondary}`}>
                  {t('landing.ctaSecondary')}
                </a>
              </div>
              <div className={`mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm ${tinyMuted}`}>
                <span className="flex items-center gap-2"><Check size={15} className={isLight ? 'text-[#001d39]' : 'text-[#ff9a63]'} /> {t('landing.fundsStay')}</span>
                <span className="flex items-center gap-2"><Check size={15} className={isLight ? 'text-[#001d39]' : 'text-[#ff9a63]'} /> {t('landing.builtOnSolana')}</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:ml-auto">
              <div className={isLight ? 'absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-[#dfeef7] to-[#cfe5f3] blur-2xl' : 'absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-[#ff8a4c]/20 to-[#7c5cff]/10 blur-2xl'} />
              <div className={`relative rounded-[1.75rem] p-5 ${panelClasses}`}>
                <div className={`flex items-center justify-between border-b pb-5 ${isLight ? 'border-[#0a4174]/10' : 'border-white/10'}`}>
                  <div>
                    <p className={`text-xs ${tinyMuted}`}>{t('landing.cardKicker')}</p>
                    <p className="mt-1 text-lg font-medium text-[#001d39]">{t('landing.cardTitle')}</p>
                  </div>
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${chipClasses}`}>USDC</span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-7">
                  <div className={`rounded-xl p-3.5 ${cardSubtle}`}>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${cardIcon}`}><Link2 size={17} /></div>
                    <p className="mt-5 text-xl font-semibold text-[#001d39]">{t('landing.stat1Value')}</p>
                    <p className={`mt-1 text-xs leading-5 ${tinyMuted}`}>{t('landing.stat1Text')}</p>
                  </div>
                  <div className={`rounded-xl p-3.5 ${cardSubtle}`}>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${cardIcon}`}><BarChart3 size={17} /></div>
                    <p className="mt-5 text-xl font-semibold text-[#001d39]">USDC <span className="text-sm text-[#0a4174]/60">→ BRL</span></p>
                    <p className={`mt-1 text-xs leading-5 ${tinyMuted}`}>{t('landing.stat2Text')}</p>
                  </div>
                  <div className={`rounded-xl p-3.5 ${cardSubtle}`}>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${cardIcon}`}><ShieldCheck size={17} /></div>
                    <p className="mt-5 text-xl font-semibold text-[#001d39]">{t('landing.stat3Value')}</p>
                    <p className={`mt-1 text-xs leading-5 ${tinyMuted}`}>{t('landing.stat3Text')}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${isLight ? 'bg-[#edf7fc] text-[#123d66]' : 'bg-white/[0.06] text-white/60'}`}>
                  <Check size={16} className={isLight ? 'text-[#0a4174]' : 'text-[#9ee6bd]'} />
                  {t('landing.cardFooter')}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className={isLight ? 'bg-[#f5faff]' : 'bg-white/[0.025]'}>
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
            <div className="max-w-xl">
              <p className={`text-sm font-medium uppercase tracking-[0.18em] ${isLight ? 'text-[#001d39]' : 'text-[#ff9a63]'}`}>{t('landing.sectionKicker')}</p>
              <h2 className={`mt-3 text-3xl font-semibold tracking-tight sm:text-4xl ${sectionTitle}`}>{t('landing.sectionTitle')}</h2>
              <p className={`mt-4 leading-7 ${sectionMuted}`}>{t('landing.sectionText')}</p>
            </div>
            <div id="features" className="mt-12 grid gap-4 md:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, description }, index) => (
                <article key={title} className={sectionCard}>
                  <div className="flex items-center justify-between">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${isLight ? 'bg-[#edf5ff] text-[#001d39]' : 'bg-[#ff8a4c]/10 text-[#ff9a63]'}`}><Icon size={21} /></span>
                    <span className={`text-sm ${isLight ? 'text-[#0a4174]/55' : 'text-white/25'}`}>0{index + 1}</span>
                  </div>
                  <h3 className={`mt-7 text-lg font-medium ${isLight ? 'text-[#001d39]' : 'text-white'}`}>{t(title)}</h3>
                  <p className={`mt-3 text-sm leading-6 ${isLight ? 'text-[#123d66]/70' : 'text-white/50'}`}>{t(description)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={isLight ? 'mx-auto max-w-7xl px-5 py-20 text-center sm:px-8 lg:py-28' : 'mx-auto max-w-7xl px-5 py-20 text-center sm:px-8 lg:py-28'}>
          <p className={`text-sm font-medium uppercase tracking-[0.18em] ${isLight ? 'text-[#001d39]' : 'text-[#ff9a63]'}`}>{t('landing.ctaKicker')}</p>
          <h2 className={`mx-auto mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl ${sectionTitle}`}>{t('landing.ctaTitle')}</h2>
          <p className={`mx-auto mt-5 max-w-xl ${sectionMuted}`}>{t('landing.ctaText')}</p>
          <Link to="/register" className={`mt-8 inline-flex items-center gap-2 rounded-xl px-5 py-3.5 font-medium text-white transition ${isLight ? 'bg-[#001d39] hover:bg-[#0a4174]' : 'bg-[#ff8a4c] hover:bg-[#ffa06e]'}`}>{t('landing.getStarted')} <ArrowRight size={18} /></Link>
        </section>
      </main>

      <footer className="px-5 py-7 sm:px-8">
        <div className={`mx-auto flex max-w-7xl flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between ${isLight ? 'text-[#0a4174]/60' : 'text-white/35'}`}>
          <span>© {new Date().getFullYear()} PayTrail</span>
          <span>{t('landing.footerTagline')}</span>
        </div>
      </footer>
    </div>
  );
}
