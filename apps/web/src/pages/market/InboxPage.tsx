import { MessageSquare, Search } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { ButtonLink } from '../../components/Button';
import { useI18n } from '../../i18n/I18nProvider';
import { ChatLayout } from './ChatLayout';

export function InboxPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  return (
    <ChatLayout>
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
        <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
          <MessageSquare size={30} />
        </div>
        <h3 className="font-semibold text-slate-900">{t('market.inbox.selectTitle')}</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-xs">
          {t('market.inbox.selectText')}
        </p>
        <ButtonLink to="/directory" variant="secondary" className="mt-5" icon={<Search size={18} />}>
          {user?.role === 'ACCOUNTANT' ? t('market.inbox.findClients') : t('market.inbox.findAccountant')}
        </ButtonLink>
      </div>
    </ChatLayout>
  );
}
