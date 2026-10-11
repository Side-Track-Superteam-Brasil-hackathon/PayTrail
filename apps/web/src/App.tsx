import type { ReactNode } from 'react';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import type { Role } from './api/client';
import { useAuth } from './auth/AuthContext';
import { Placeholder } from './components/Placeholder';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { InvoiceDetailPage } from './pages/finance/InvoiceDetailPage';
import { InvoicesPage } from './pages/finance/InvoicesPage';
import { NewInvoicePage } from './pages/finance/NewInvoicePage';
import { PayPage } from './pages/finance/PayPage';
import { ProfilePage } from './pages/finance/ProfilePage';
import { ReportPage } from './pages/finance/ReportPage';
import { UnmatchedPage } from './pages/finance/UnmatchedPage';
import { VerifyPage } from './pages/finance/VerifyPage';
import { ClientsPage } from './pages/market/ClientsPage';
import { ConversationPage } from './pages/market/ConversationPage';
import { DirectoryPage } from './pages/market/DirectoryPage';
import { InboxPage } from './pages/market/InboxPage';
import { MyAccountantsPage } from './pages/market/MyAccountantsPage';

const NAV: Record<Role, { to: string; label: string }[]> = {
  FREELANCER: [
    { to: '/invoices', label: 'Invoices' },
    { to: '/payments/unmatched', label: 'Unmatched' },
    { to: '/reports', label: 'Monthly report' },
    { to: '/directory', label: 'Find an accountant' },
    { to: '/inbox', label: 'Inbox' },
    { to: '/accountants', label: 'My accountants' },
  ],
  ACCOUNTANT: [
    { to: '/clients', label: 'My clients' },
    { to: '/directory', label: 'Find clients' },
    { to: '/inbox', label: 'Inbox' },
  ],
};

function Protected({ role, children }: { role?: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'FREELANCER' ? '/invoices' : '/clients'} replace />;
}

export function App() {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">PayTrail</Link>
        {user && (
          <nav>
            {NAV[user.role].map((n) => (
              <NavLink key={n.to} to={n.to}>{n.label}</NavLink>
            ))}
            <NavLink to="/profile">Profile</NavLink>
            <button className="link" onClick={logout}>Log out</button>
          </nav>
        )}
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
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

          <Route path="*" element={<Placeholder title="Not found" spec="—" />} />
        </Routes>
      </main>
    </div>
  );
}
