import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cx } from './cx';

type AlertTone = 'error' | 'success' | 'warning' | 'info';

const STYLE: Record<AlertTone, string> = {
  error: 'bg-red-50 border-red-200 text-red-700',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-indigo-50 border-indigo-100 text-indigo-800',
};

const ICON: Record<AlertTone, ReactNode> = {
  error: <AlertCircle size={18} />,
  success: <CheckCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

export function Alert({ tone = 'error', children, className }: { tone?: AlertTone; children: ReactNode; className?: string }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx(
        'flex items-start gap-2.5 border rounded-xl px-4 py-3 text-sm [&_a]:font-semibold [&_a]:underline',
        STYLE[tone],
        className,
      )}
    >
      <span className="mt-px shrink-0">{ICON[tone]}</span>
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}
