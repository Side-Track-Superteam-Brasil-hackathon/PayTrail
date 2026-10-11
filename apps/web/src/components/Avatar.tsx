import { cx } from './cx';

const COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
];

const SIZE = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
} as const;

export function initials(name: string | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

interface Props {
  name?: string;
  /** Stable seed for the color (defaults to the name). */
  seed?: string;
  size?: keyof typeof SIZE;
  className?: string;
}

export function Avatar({ name, seed, size = 'md', className }: Props) {
  return (
    <div
      aria-hidden="true"
      className={cx(
        'rounded-full flex items-center justify-center font-bold shrink-0 select-none',
        SIZE[size],
        colorFor(seed ?? name ?? ''),
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
