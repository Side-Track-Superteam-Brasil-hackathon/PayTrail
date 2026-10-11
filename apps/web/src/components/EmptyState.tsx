import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon, title, children, action }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-12 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {children && <div className="text-sm text-slate-500 mt-1 max-w-md mx-auto [&_a]:font-medium [&_a]:text-indigo-600">{children}</div>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
