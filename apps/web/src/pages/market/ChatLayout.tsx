import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { api } from '../../api/client';
import type { Conversation } from '../../api/types';
import { Avatar } from '../../components/Avatar';
import { cx } from '../../components/cx';
import { Loading } from '../../components/Loading';
import { errorMessage } from './errors';
import { relativeTime } from './time';
import { usePolling } from './usePolling';

function preview(c: Conversation): string {
  const m = c.lastMessage;
  if (!m) return 'No messages yet';
  if (m.type === 'PROPOSAL') return 'Proposal sent';
  return m.body ?? '';
}

function ConversationList({ activeId }: { activeId?: string }) {
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
    <div className="flex-1 overflow-y-auto">
      {error && <p className="m-4 text-sm text-red-600">{error}</p>}
      {items === null && !error && <div className="px-4"><Loading /></div>}
      {items?.length === 0 && (
        <div className="p-6 text-center text-sm text-slate-500">
          <p>No conversations yet.</p>
          <p className="mt-1">
            <Link to="/directory" className="font-medium text-indigo-600 hover:text-indigo-800">Browse the directory</Link> to start one.
          </p>
        </div>
      )}
      {items?.map((c) => {
        const active = c.id === activeId;
        return (
          <Link
            key={c.id}
            to={`/inbox/${c.id}`}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'p-4 border-l-4 flex items-center gap-3 transition-colors',
              active ? 'bg-indigo-50 border-indigo-600' : 'border-transparent hover:bg-white',
            )}
          >
            <Avatar name={c.other?.name} seed={c.other?.id} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="font-medium text-slate-900 truncate">{c.other?.name}</h4>
                <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">{relativeTime(c.lastMessageAt)}</span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                <span className="capitalize">{c.other?.role?.toLowerCase()}</span> · {preview(c)}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Two-pane chat: conversation list on the left, `children` (thread or empty state) on the right.
 * On mobile only one pane is shown: the list without `activeId`, the thread with it.
 */
export function ChatLayout({ activeId, children }: { activeId?: string; children: ReactNode }) {
  return (
    <div className="h-[calc(100dvh-7rem)] md:h-[calc(100dvh-4rem)] min-h-[420px] flex rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-200">
      <div
        className={cx(
          'w-full md:w-72 xl:w-96 md:border-r border-slate-200 bg-slate-50 flex-col shrink-0',
          activeId ? 'hidden md:flex' : 'flex',
        )}
      >
        <div className="p-4 border-b border-slate-200 bg-white flex items-center gap-2">
          <MessageSquare size={20} className="text-indigo-600" />
          <h2 className="font-semibold text-lg text-slate-900">Messages</h2>
        </div>
        <ConversationList activeId={activeId} />
      </div>
      <div className={cx('flex-1 min-w-0 flex-col bg-white', activeId ? 'flex' : 'hidden md:flex')}>{children}</div>
    </div>
  );
}
