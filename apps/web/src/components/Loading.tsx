import { Loader2 } from 'lucide-react';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 py-6">
      <Loader2 size={16} className="animate-spin" /> {label}
    </div>
  );
}
