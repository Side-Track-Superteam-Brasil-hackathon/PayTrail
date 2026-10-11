import type { ReactNode } from 'react';
import { cx } from './cx';

export type PillTone = 'emerald' | 'amber' | 'blue' | 'violet' | 'slate' | 'red' | 'indigo';

const TONE: Record<PillTone, string> = {
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
};

export function Pill({ tone = 'slate', children, className }: { tone?: PillTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
