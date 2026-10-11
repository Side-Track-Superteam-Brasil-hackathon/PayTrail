import { MessageSquare, Search } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { ButtonLink } from '../../components/Button';
import { ChatLayout } from './ChatLayout';

export function InboxPage() {
  const { user } = useAuth();
  return (
    <ChatLayout>
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
        <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
          <MessageSquare size={30} />
        </div>
        <h3 className="font-semibold text-slate-900">Select a conversation</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-xs">
          Pick a conversation on the left, or find someone new in the directory.
        </p>
        <ButtonLink to="/directory" variant="secondary" className="mt-5" icon={<Search size={18} />}>
          {user?.role === 'ACCOUNTANT' ? 'Find clients' : 'Find an accountant'}
        </ButtonLink>
      </div>
    </ChatLayout>
  );
}
