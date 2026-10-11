import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { Conversation } from '../../api/types';
import { errorMessage } from './errors';
import { relativeTime } from './time';
import { usePolling } from './usePolling';
import './market.css';

function preview(c: Conversation): string {
  const m = c.lastMessage;
  if (!m) return 'No messages yet';
  if (m.type === 'PROPOSAL') return 'Proposal sent';
  return m.body ?? '';
}

export function InboxPage() {
  const [items, setItems] = useState<Conversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  usePolling(async () => {
    try {
      const r = await api<Conversation[]>('/conversations');
      setItems([...r].sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '')));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, 10_000);

  return (
    <div className="market">
      <div className="page-head">
        <h1>Inbox</h1>
      </div>
      {error && <p className="error">{error}</p>}
      {items === null && !error && <p className="muted">Loading...</p>}
      {items?.length === 0 && (
        <div className="card empty">
          <p className="muted">No conversations yet.</p>
          <Link to="/directory">Browse the directory</Link> to start one.
        </div>
      )}
      {items && items.length > 0 && (
        <div className="list">
          {items.map((c) => (
            <Link className="row-link" to={`/inbox/${c.id}`} key={c.id}>
              <div style={{ minWidth: 0 }}>
                <strong>{c.other?.name}</strong> <span className="role-tag">{c.other?.role?.toLowerCase()}</span>
                <div className="muted small preview">{preview(c)}</div>
              </div>
              <span className="muted small" style={{ whiteSpace: 'nowrap' }}>{relativeTime(c.lastMessageAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
