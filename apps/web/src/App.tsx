import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  AlertTriangle, BarChart3, Briefcase, Compass, FileText, Home as HomeIcon, LogOut, Menu, MessageSquare, Search, Settings,
  ShieldCheck, X, type LucideIcon,
} from 'lucide-react';
import type { Role } from './api/client';
import { useAuth } from './auth/AuthContext';
import { Avatar } from './components/Avatar';
import { ButtonLink } from './components/Button';
import { cx } from './components/cx';
import { EmptyState } from './components/EmptyState';
import { Loading } from './components/Loading';
import { LoginPage } from './pages/LoginPage';
import { LandingPage } from './pages/LandingPage';
import { RegisterPage } from './pages/RegisterPage';
import { InvoiceDetailPage } from './pages/finance/InvoiceDetailPage';
import { InvoicesPage } from './pages/finance/InvoicesPage';
import { NewInvoicePage } from './pages/finance/NewInvoicePage';
import { PayPage } from './pages/finance/PayPage';
import { ProfilePage } from './pages/finance/ProfilePage';
import { ReportPage } from './pages/finance/ReportPage';
import { UnmatchedPage } from './pages/finance/UnmatchedPage';
import { VerifyPage } from './pages/finance/VerifyPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/market/ClientsPage';
import { ConversationPage } from './pages/market/ConversationPage';
import { DirectoryPage } from './pages/market/DirectoryPage';
import { InboxPage } from './pages/market/InboxPage';
import { MyAccountantsPage } from './pages/market/MyAccountantsPage';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV: Record<Role, NavItem[]> = {
  FREELANCER: [
    { to: '/dashboard', label: 'Overview', icon: HomeIcon },
    { to: '/invoices', label: 'Invoices', icon: FileText },
    { to: '/payments/unmatched', label: 'Unmatched', icon: AlertTriangle },
    { to: '/reports', label: 'Monthly report', icon: BarChart3 },
    { to: '/directory', label: 'Find an accountant', icon: Search },
    { to: '/inbox', label: 'Messages', icon: MessageSquare },
    { to: '/accountants', label: 'My accountants', icon: ShieldCheck },
  ],
  ACCOUNTANT: [
    { to: '/dashboard', label: 'Overview', icon: HomeIcon },
    { to: '/clients', label: 'My clients', icon: Briefcase },
    { to: '/directory', label: 'Find clients', icon: Search },
    { to: '/inbox', label: 'Messages', icon: MessageSquare },
  ],
};

/** Public pages and auth screens render full-page, without the app sidebar. */
function isBare(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/pay/') ||
    pathname === '/verify' ||
    pathname.startsWith('/verify/')
  );
}

function Protected({ role, children }: { role?: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <LandingPage />;
  return <Navigate to="/dashboard" replace />;
}

function NotFound() {
  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <EmptyState icon={<Compass size={26} />} title="Page not found" action={<ButtonLink to="/">Go home</ButtonLink>}>
        The page you are looking for does not exist or was moved.
      </EmptyState>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  if (!user) return null;
  const accountant = user.role === 'ACCOUNTANT';
  const active = accountant ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700';

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-slate-100">
        <Link to="/" onClick={onNavigate} className="inline-block">
          <span className="block text-2xl font-bold tracking-tight text-indigo-600">PayTrail</span>
          <span
            className={cx(
              'block text-xs font-medium uppercase mt-1 tracking-wider',
              accountant ? 'text-emerald-600' : 'text-slate-500',
            )}
          >
            {accountant ? 'Accountant mode' : 'Freelancer mode'}
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1" aria-label="Main">
        {NAV[user.role].map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cx(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors',
                isActive ? active : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )
            }
          >
            <Icon size={20} className="shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 p-2">
          <Avatar name={user.name} seed={user.id} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <NavLink
            to="/profile"
            onClick={onNavigate}
            className={({ isActive }) =>
              cx(
                'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive ? active : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )
            }
          >
            <Settings size={16} /> Profile
          </NavLink>
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              logout();
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      </div>
    </div>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="flex h-[100dvh] bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 bg-white border-r border-slate-200 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-5 right-4 p-2 text-slate-500 hover:text-slate-900 rounded-lg"
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="md:hidden h-16 shrink-0 flex items-center justify-between px-4 bg-white border-b border-slate-200">
          <Link to="/" className="text-xl font-bold text-indigo-600">PayTrail</Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="p-2 -mr-2 text-slate-600 hover:text-slate-900 rounded-lg"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 py-6 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function App() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const routes = (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Públicas */}
      <Route path="/pay/:publicId" element={<PayPage />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/verify/:hash" element={<VerifyPage />} />

      {/* Freelancer — finance */}
      <Route path="/invoices" element={<Protected role="FREELANCER"><InvoicesPage /></Protected>} />
      <Route path="/invoices/new" element={<Protected role="FREELANCER"><NewInvoicePage /></Protected>} />
      <Route path="/invoices/:id" element={<Protected role="FREELANCER"><InvoiceDetailPage /></Protected>} />
      <Route path="/payments/unmatched" element={<Protected role="FREELANCER"><UnmatchedPage /></Protected>} />
      <Route path="/reports" element={<Protected role="FREELANCER"><ReportPage /></Protected>} />

      {/* Contador — relatório do cliente (mesma tela, com freelancerId) */}
      <Route path="/clients/:freelancerId/:month" element={<Protected role="ACCOUNTANT"><ReportPage /></Protected>} />

      {/* Marketplace */}
      <Route path="/accountants" element={<Protected role="FREELANCER"><MyAccountantsPage /></Protected>} />
      <Route path="/clients" element={<Protected role="ACCOUNTANT"><ClientsPage /></Protected>} />
      <Route path="/directory" element={<Protected><DirectoryPage /></Protected>} />
      <Route path="/inbox" element={<Protected><InboxPage /></Protected>} />
      <Route path="/inbox/:conversationId" element={<Protected><ConversationPage /></Protected>} />

      {/* Ambos */}
      <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  if (!user || isBare(pathname)) {
    return <div className="min-h-[100dvh] bg-slate-50">{routes}</div>;
  }
  return <AppShell>{routes}</AppShell>;
}
