import { Loader2 } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

export function Loading({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 py-6">
      <Loader2 size={16} className="animate-spin" /> {label ?? t('common.loading')}
    </div>
  );
}
