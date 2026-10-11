import type { ReactNode } from 'react';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import type { Role } from './api/client';
import { useAuth } from './auth/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Placeholder } from './pages/Placeholder';
import { RegisterPage } from './pages/RegisterPage';

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
  const { user } = useAuth();
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
          <Route path="/pay/:publicId" element={<Placeholder title="Pay invoice" spec="A2, A3 · 04-onchain (Solana Pay QR)" />} />
          <Route path="/verify/:hash" element={<Placeholder title="Verify receipt" spec="A5 · 02-conciliacao §4" />} />

          {/* Freelancer */}
          <Route path="/invoices" element={<Protected role="FREELANCER"><Placeholder title="Invoices" spec="A1 · fatia 1" /></Protected>} />
          <Route path="/invoices/new" element={<Protected role="FREELANCER"><Placeholder title="New invoice" spec="A1 · fatia 1" /></Protected>} />
          <Route path="/invoices/:id" element={<Protected role="FREELANCER"><Placeholder title="Invoice detail & trail" spec="A2–A5 · fatias 2–3" /></Protected>} />
          <Route path="/payments/unmatched" element={<Protected role="FREELANCER"><Placeholder title="Unmatched payments" spec="A4 · fatia 2" /></Protected>} />
          <Route path="/reports" element={<Protected role="FREELANCER"><Placeholder title="Monthly report" spec="02-conciliacao §5 · fatia 3" /></Protected>} />
          <Route path="/accountants" element={<Protected role="FREELANCER"><Placeholder title="My accountants" spec="A8, A9 · fatia 6" /></Protected>} />

          {/* Contador */}
          <Route path="/clients" element={<Protected role="ACCOUNTANT"><Placeholder title="My clients" spec="A7, A8 · fatia 3/6" /></Protected>} />
          <Route path="/clients/:freelancerId/:month" element={<Protected role="ACCOUNTANT"><Placeholder title="Client monthly report" spec="A8 · fatia 3" /></Protected>} />

          {/* Ambos */}
          <Route path="/profile" element={<Protected><Placeholder title="Profile & wallet" spec="PATCH /me · fatia 1" /></Protected>} />
          <Route path="/directory" element={<Protected><Placeholder title="Directory" spec="A6 · fatia 4" /></Protected>} />
          <Route path="/inbox" element={<Protected><Placeholder title="Inbox" spec="A6 · fatia 5" /></Protected>} />
          <Route path="/inbox/:conversationId" element={<Protected><Placeholder title="Conversation" spec="A6, A7 · fatias 5–6" /></Protected>} />

          <Route path="*" element={<Placeholder title="Not found" spec="—" />} />
        </Routes>
      </main>
    </div>
  );
}
