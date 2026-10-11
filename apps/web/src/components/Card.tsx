import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function Card({ padded = true, className, ...rest }: CardProps) {
  return (
    <div
      className={cx('bg-white rounded-2xl border border-slate-200 shadow-sm', padded && 'p-5 sm:p-6', className)}
      {...rest}
    />
  );
}

export function CardTitle({ children, icon, action }: { children: ReactNode; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900">
        {icon && <span className="text-slate-400">{icon}</span>}
        {children}
      </h3>
      {action}
    </div>
  );
}
