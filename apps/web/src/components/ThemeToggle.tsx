import { Moon, Sun } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme } from '../theme/ThemeContext';

export function ThemeToggle({ compact = false, darkSurface = false }: { compact?: boolean; darkSurface?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const isLight = theme === 'light';
  const label = isLight ? t('theme.switchToDark') : t('theme.switchToLight');

  const compactClasses = darkSurface
    ? isLight
      ? 'inline-flex items-center justify-center rounded-lg border border-[#0a4174]/15 bg-[#001d39] p-2 text-white shadow-sm transition-colors hover:bg-[#0a4174]'
      : 'inline-flex items-center justify-center rounded-lg p-2 text-white/75 transition-colors hover:bg-white/10 hover:text-white'
    : isLight
      ? 'inline-flex items-center justify-center rounded-lg border border-[#0a4174]/15 bg-[#001d39] p-2 text-white shadow-sm transition-colors hover:bg-[#0a4174]'
      : 'inline-flex items-center justify-center rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={compact ? compactClasses       : 'inline-flex items-center justify-center gap-2 rounded-xl border border-[#0a4174]/15 bg-[#001d39] px-3 py-2 text-sm font-medium text-white whitespace-nowrap shadow-sm transition-colors hover:bg-[#0a4174]'}
      aria-label={label}
      title={label}
    >
      {isLight ? <Moon size={compact ? 20 : 16} /> : <Sun size={compact ? 20 : 16} />}
      {!compact && (isLight ? t('theme.dark') : t('theme.light'))}
    </button>
  );
}
