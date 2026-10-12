import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '../../components/Button';
import { useI18n } from '../../i18n/I18nProvider';

export function CopyButton({ text, label, className }: { text: string; label?: string; className?: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  };
  return (
    <Button
      variant={done ? 'success' : 'secondary'}
      size="sm"
      onClick={() => void copy()}
      className={className}
      icon={done ? <Check size={16} /> : <Copy size={16} />}
    >
      {done ? t('common.copied') : (label ?? t('common.copy'))}
    </Button>
  );
}
