import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cx } from './cx';

export function Table({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">{children}</table>
      </div>
      {footer}
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="bg-slate-50 border-b border-slate-200">{children}</tr>
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function Th({ className, num, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { num?: boolean }) {
  return (
    <th
      className={cx(
        'px-4 sm:px-6 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap',
        num && 'text-right',
        className,
      )}
      {...rest}
    />
  );
}

export function Td({ className, num, ...rest }: TdHTMLAttributes<HTMLTableCellElement> & { num?: boolean }) {
  return (
    <td
      className={cx(
        'px-4 sm:px-6 py-4 text-sm text-slate-600 align-middle',
        num && 'text-right tabular-nums whitespace-nowrap',
        className,
      )}
      {...rest}
    />
  );
}
