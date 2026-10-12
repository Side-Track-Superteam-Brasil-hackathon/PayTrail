import type { ReactNode } from 'react';
import { cx } from './cx';

/** Input look without width/padding, for inputs that need their own sizing. */
export const inputBase =
  // Texto claro: no tema escuro, bg-white é sobrescrito para um fundo escuro (styles.css).
  'min-w-0 rounded-xl border border-slate-300 bg-white text-slate-100 placeholder:text-slate-400 ' +
  'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-60 [&>option]:bg-[#11131a]';

export const inputClass = `${inputBase} w-full px-4 py-2.5`;

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx('block', className)}>
      <span className="block text-sm font-medium text-slate-700 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500 mt-1.5">{hint}</span>}
    </label>
  );
}
