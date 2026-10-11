import type { ReactNode } from 'react';
import { cx } from './cx';

export type Tone = 'emerald' | 'amber' | 'indigo' | 'blue' | 'slate' | 'red';

const CHIP: Record<Tone, string> = {
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  blue: 'bg-blue-50 text-blue-600',
  slate: 'bg-slate-100 text-slate-600',
  red: 'bg-red-50 text-red-600',
};

interface Props {
  label: string;
  value: ReactNode;
  suffix?: string;
  icon: ReactNode;
  tone?: Tone;
  footer?: ReactNode;
  highlight?: boolean;
}

export function StatCard({ label, value, suffix, icon, tone = 'indigo', footer, highlight }: Props) {
  return (
    <div
      className={cx(
        'bg-white p-5 sm:p-6 rounded-2xl shadow-sm border',
        highlight ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-slate-200',
      )}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
          <div className="text-2xl xl:text-3xl font-bold text-slate-900 tabular-nums">
            {/* Número nunca quebra no meio; o sufixo pode ir para a linha de baixo. */}
            <span className="whitespace-nowrap">{value}</span>
            {suffix && <span className="text-base sm:text-lg text-slate-400 font-medium ml-1.5">{suffix}</span>}
          </div>
        </div>
        <div className={cx('p-2 rounded-lg shrink-0', CHIP[tone])}>{icon}</div>
      </div>
      {footer && <div className="mt-3 text-sm">{footer}</div>}
    </div>
  );
}
