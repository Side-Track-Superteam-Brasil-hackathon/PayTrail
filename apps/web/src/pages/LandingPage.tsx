import { ArrowRight, BarChart3, Check, FileCheck2, Link2, Menu, ShieldCheck, WalletCards, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const FEATURES = [
  {
    icon: Link2,
    title: 'Know what got paid',
    description: 'Keep invoices and Solana transfers together, even when a client pays from an exchange.',
  },
  {
    icon: BarChart3,
    title: 'See your income in BRL',
    description: 'Each payment is converted using the right exchange rate and kept in your monthly history.',
  },
  {
    icon: FileCheck2,
    title: 'Make your accountant’s life easier',
    description: 'Send organized reports and verifiable receipts instead of putting another spreadsheet together.',
  },
];

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-[#0a0b10] text-white">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff8a4c] shadow-[0_0_24px_rgba(255,138,76,0.35)]">
            <WalletCards size={19} strokeWidth={2.5} />
          </span>
          <span className="text-xl font-semibold tracking-tight">PayTrail</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-white/65 md:flex" aria-label="Landing page">
          <a href="#how-it-works" className="transition-colors hover:text-white">How it works</a>
          <a href="#features" className="transition-colors hover:text-white">Features</a>
          <Link to="/login" className="transition-colors hover:text-white">Log in</Link>
          <Link to="/register" className="rounded-xl bg-[#ff8a4c] px-4 py-2.5 font-medium text-white transition hover:bg-[#ffa06e]">
            Get started
          </Link>
        </nav>

        <button
          type="button"
          className="rounded-lg p-2 text-white/75 md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {menuOpen && (
        <nav className="relative z-10 mx-5 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur md:hidden" aria-label="Mobile landing page">
          <div className="flex flex-col gap-1 text-sm">
            <a href="#how-it-works" className="rounded-lg px-3 py-2.5 text-white/75 hover:bg-white/10 hover:text-white" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#features" className="rounded-lg px-3 py-2.5 text-white/75 hover:bg-white/10 hover:text-white" onClick={() => setMenuOpen(false)}>Features</a>
            <Link to="/login" className="rounded-lg px-3 py-2.5 text-white/75 hover:bg-white/10 hover:text-white">Log in</Link>
            <Link to="/register" className="mt-2 rounded-xl bg-[#ff8a4c] px-3 py-2.5 text-center font-medium text-white transition hover:bg-[#ffa06e]">Get started</Link>
          </div>
        </nav>
      )}

      <main>
        <section className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:pb-32 lg:pt-28">
          <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-[#e9612c]/20 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-20 h-80 w-80 rounded-full bg-[#7048ff]/15 blur-3xl" />
          <div className="relative grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#ffb078]/25 bg-[#ffb078]/10 px-3.5 py-2 text-xs font-medium text-[#ffc39e]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ff9a63]" />
                For freelancers who work with clients abroad
              </div>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                Get paid globally. <span className="text-[#ff9a63]">Keep things simple here.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-white/60 sm:text-xl">
                PayTrail helps you keep USDC payments, invoices and BRL records in one place, with a clear trail for you and your accountant.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff8a4c] px-5 py-3.5 font-medium text-[#1b100b] shadow-[0_8px_30px_rgba(255,138,76,0.25)] transition hover:bg-[#ffa06e]">
                  Create your free account <ArrowRight size={18} />
                </Link>
                <a href="#how-it-works" className="inline-flex items-center justify-center rounded-xl border border-white/15 px-5 py-3.5 font-medium text-white/80 transition hover:border-white/30 hover:text-white">
                  See how PayTrail works
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/45">
                <span className="flex items-center gap-2"><Check size={15} className="text-[#ff9a63]" /> Your funds stay in your wallet</span>
                <span className="flex items-center gap-2"><Check size={15} className="text-[#ff9a63]" /> Built on Solana</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:ml-auto">
              <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-[#ff8a4c]/20 to-[#7c5cff]/10 blur-2xl" />
              <div className="relative rounded-[1.75rem] border border-white/15 bg-[#15151d]/90 p-5 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div>
                    <p className="text-xs text-white/45">The PayTrail difference</p>
                    <p className="mt-1 text-lg font-medium">One payment, a complete record</p>
                  </div>
                  <span className="rounded-lg bg-[#ff8a4c]/15 px-2.5 py-1 text-xs font-medium text-[#ffb58d]">USDC</span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-7">
                  <div className="rounded-xl bg-white/[0.06] p-3.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff8a4c]/15 text-[#ff9a63]"><Link2 size={17} /></div>
                    <p className="mt-5 text-xl font-semibold">1 place</p>
                    <p className="mt-1 text-xs leading-5 text-white/45">Invoices and payments</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.06] p-3.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ffc078]/15 text-[#ffc078]"><BarChart3 size={17} /></div>
                    <p className="mt-5 text-xl font-semibold">USDC <span className="text-sm text-white/40">→ BRL</span></p>
                    <p className="mt-1 text-xs leading-5 text-white/45">Clear conversion history</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.06] p-3.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#9ee6bd]/10 text-[#9ee6bd]"><ShieldCheck size={17} /></div>
                    <p className="mt-5 text-xl font-semibold">Verified</p>
                    <p className="mt-1 text-xs leading-5 text-white/45">Ready to share</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-3 text-sm text-white/60">
                  <Check size={16} className="text-[#9ee6bd]" />
                  A clearer way to close the month
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-white/[0.025]">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
            <div className="max-w-xl">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#ff9a63]">A calmer way to keep up</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Everything in its place.</h2>
              <p className="mt-4 leading-7 text-white/55">The work is still yours. PayTrail just takes the guesswork out of following the money.</p>
            </div>
            <div id="features" className="mt-12 grid gap-4 md:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, description }, index) => (
                <article key={title} className="rounded-2xl border border-white/10 bg-[#111219] p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ff8a4c]/10 text-[#ff9a63]"><Icon size={21} /></span>
                    <span className="text-sm text-white/25">0{index + 1}</span>
                  </div>
                  <h3 className="mt-7 text-lg font-medium">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/50">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 text-center sm:px-8 lg:py-28">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#ff9a63]">Take the next step</p>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">Spend less time chasing receipts.</h2>
          <p className="mx-auto mt-5 max-w-xl text-white/55">Set up your PayTrail account and start building a payment history you can actually use.</p>
          <Link to="/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#ff8a4c] px-5 py-3.5 font-medium text-white transition hover:bg-[#ffa06e]">Get started <ArrowRight size={18} /></Link>
        </section>
      </main>

      <footer className="px-5 py-7 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} PayTrail</span>
          <span>Payments on Solana. Records ready for Brazil.</span>
        </div>
      </footer>
    </div>
  );
}
