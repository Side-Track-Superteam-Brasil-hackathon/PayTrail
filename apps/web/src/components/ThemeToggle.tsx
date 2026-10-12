import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

export function ThemeToggle({ compact = false, darkSurface = false }: { compact?: boolean; darkSurface?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'light' ? 'dark' : 'light';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={compact
        ? darkSurface
          ? 'inline-flex items-center justify-center rounded-lg p-2 text-white/75 transition-colors hover:bg-white/10 hover:text-white'
          : 'inline-flex items-center justify-center rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900'
        : 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50'}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      {theme === 'light' ? <Moon size={compact ? 20 : 16} /> : <Sun size={compact ? 20 : 16} />}
      {!compact && (theme === 'light' ? 'Dark mode' : 'Light mode')}
    </button>
  );
}
